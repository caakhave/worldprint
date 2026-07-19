@preconcurrency import Capacitor
import Foundation
import StoreKit
import UIKit

private let appleMonthlyProductId = "com.canyougeo.pro.monthly"
private let appleAnnualProductId = "com.canyougeo.pro.annual"
private let appleAllowedProductIds: Set<String> = [appleMonthlyProductId, appleAnnualProductId]
private let appleOrderedProductIds = [appleMonthlyProductId, appleAnnualProductId]
private let appleCatalogLoadedStatus = "loaded"
private let appleCatalogZeroProductsStatus = "zero_products"
private let appleCatalogPartialStatus = "partial"
private let appleCatalogUnsupportedStatus = "unsupported"
private let appleCatalogNetworkErrorStatus = "network_error"
private let appleCatalogStorefrontUnavailableStatus = "storefront_unavailable"
private let appleCatalogNotEntitledStatus = "not_entitled"
private let appleCatalogSystemErrorStatus = "system_error"
private let appleCatalogUnknownErrorStatus = "unknown_error"

@objc(AppleStoreKitPlugin)
public class AppleStoreKitPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "AppleStoreKitPlugin"
    public let jsName = "AppleStoreKit"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "isAvailable", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "loadProducts", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "purchase", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "restorePurchases", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "syncUnfinished", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "finishVerifiedTransactions", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "manageSubscription", returnType: CAPPluginReturnPromise)
    ]

    private var transactionUpdatesTask: Task<Void, Never>?
    private let pendingTransactions = AppleStoreKitPendingTransactionStore()

    public override func load() {
        startTransactionUpdates()
    }

    deinit {
        transactionUpdatesTask?.cancel()
    }

    @objc func isAvailable(_ call: CAPPluginCall) {
        guard #available(iOS 15.0, *) else {
            call.resolve(["available": false, "platform": "ios", "reason": "storekit_unavailable"])
            return
        }
        call.resolve(["available": true, "platform": "ios"])
    }

    @objc func loadProducts(_ call: CAPPluginCall) {
        guard #available(iOS 15.0, *) else {
            call.resolve(baseAppleProductCatalogDictionary(
                products: [],
                requestedProductIds: appleOrderedProductIds,
                missingProductIds: appleOrderedProductIds,
                status: appleCatalogUnsupportedStatus
            ))
            return
        }

        let requestedIds = call.getArray("productIds", String.self) ?? appleOrderedProductIds
        let productIds = requestedIds.filter { appleAllowedProductIds.contains($0) }

        Task {
            let result = await self.loadApprovedProducts(productIds: productIds)
            DispatchQueue.main.async {
                call.resolve(result)
            }
        }
    }

    @objc func purchase(_ call: CAPPluginCall) {
        guard #available(iOS 15.0, *) else {
            call.resolve(AppleStoreKitNativeResult(status: "storeUnavailable").dictionary)
            return
        }
        guard let productId = call.getString("productId"), appleAllowedProductIds.contains(productId) else {
            call.resolve(AppleStoreKitNativeResult(status: "productUnavailable").dictionary)
            return
        }
        guard let config = AppleStoreKitAuthenticatedConfig(call: call) else {
            call.resolve(AppleStoreKitNativeResult(status: "requiresSignIn").dictionary)
            return
        }

        Task {
            let result = await self.performPurchase(productId: productId, config: config)
            DispatchQueue.main.async {
                call.resolve(result.dictionary)
            }
        }
    }

    @objc func restorePurchases(_ call: CAPPluginCall) {
        guard #available(iOS 15.0, *) else {
            call.resolve(AppleStoreKitNativeResult(status: "storeUnavailable").dictionary)
            return
        }
        guard let config = AppleStoreKitAuthenticatedConfig(call: call) else {
            call.resolve(AppleStoreKitNativeResult(status: "requiresSignIn").dictionary)
            return
        }

        Task {
            let result = await self.performRestore(config: config)
            DispatchQueue.main.async {
                call.resolve(result.dictionary)
            }
        }
    }

    @objc func syncUnfinished(_ call: CAPPluginCall) {
        guard #available(iOS 15.0, *) else {
            call.resolve(AppleStoreKitNativeResult(status: "storeUnavailable").dictionary)
            return
        }
        guard let config = AppleStoreKitAuthenticatedConfig(call: call) else {
            call.resolve(AppleStoreKitNativeResult(status: "requiresSignIn").dictionary)
            return
        }

        Task {
            let result = await self.verifyOutstandingTransactions(config: config)
            DispatchQueue.main.async {
                call.resolve(result.dictionary)
            }
        }
    }

    @objc func finishVerifiedTransactions(_ call: CAPPluginCall) {
        guard #available(iOS 15.0, *) else {
            call.resolve(["finishedCount": 0])
            return
        }

        Task {
            let finishedCount = await self.pendingTransactions.finishAll()
            DispatchQueue.main.async {
                call.resolve(["finishedCount": finishedCount])
            }
        }
    }

    @objc func manageSubscription(_ call: CAPPluginCall) {
        guard #available(iOS 15.0, *) else {
            call.resolve(["opened": false, "status": "unavailable"])
            return
        }

        Task { @MainActor in
            guard let scene = UIApplication.shared.connectedScenes.compactMap({ $0 as? UIWindowScene }).first(where: { $0.activationState == .foregroundActive }) else {
                call.resolve(["opened": false, "status": "unavailable"])
                return
            }
            do {
                try await AppStore.showManageSubscriptions(in: scene)
                call.resolve(["opened": true, "status": "opened"])
            } catch {
                call.resolve(["opened": false, "status": "failed"])
            }
        }
    }

    private func startTransactionUpdates() {
        guard #available(iOS 15.0, *), transactionUpdatesTask == nil else {
            return
        }

        transactionUpdatesTask = Task.detached { [weak self] in
            for await verificationResult in Transaction.updates {
                self?.notifyTransactionUpdate(verificationResult)
            }
        }
    }

    @available(iOS 15.0, *)
    private func notifyTransactionUpdate(_ verificationResult: VerificationResult<Transaction>) {
        var data: [String: Any] = [:]
        switch verificationResult {
        case .verified(let transaction):
            if appleAllowedProductIds.contains(transaction.productID) {
                data = ["status": "pendingVerification", "productId": transaction.productID]
            }
        case .unverified(let transaction, _):
            if appleAllowedProductIds.contains(transaction.productID) {
                data = ["status": "unverified", "productId": transaction.productID]
            }
        }

        guard !data.isEmpty else {
            return
        }

        DispatchQueue.main.async {
            self.notifyListeners("transactionUpdated", data: data)
        }
    }

    @available(iOS 15.0, *)
    private func loadApprovedProducts(productIds: [String]) async -> [String: Any] {
        do {
            let products = try await Product.products(for: productIds)
            let productsById = Dictionary(uniqueKeysWithValues: products.map { ($0.id, $0) })
            let normalized = appleOrderedProductIds.compactMap { productId -> [String: Any]? in
                guard productIds.contains(productId), let product = productsById[productId], product.subscription != nil else {
                    return nil
                }
                return appleProductDictionary(product)
            }
            let loadedIds = Set(normalized.compactMap { $0["productId"] as? String })
            let missingIds = productIds.filter { !loadedIds.contains($0) }
            let status = appleCatalogStatus(returnedCount: normalized.count, requestedCount: productIds.count, missingCount: missingIds.count)
            return baseAppleProductCatalogDictionary(products: normalized, requestedProductIds: productIds, missingProductIds: missingIds, status: status)
        } catch {
            return baseAppleProductCatalogDictionary(products: [], requestedProductIds: productIds, missingProductIds: productIds, status: appleCatalogStatus(for: error))
        }
    }

    private func appleCatalogStatus(returnedCount: Int, requestedCount: Int, missingCount: Int) -> String {
        if returnedCount == 0 {
            return appleCatalogZeroProductsStatus
        }
        if missingCount == 0 && returnedCount == requestedCount {
            return appleCatalogLoadedStatus
        }
        return appleCatalogPartialStatus
    }

    @available(iOS 15.0, *)
    private func appleCatalogStatus(for error: Error) -> String {
        guard let storeKitError = error as? StoreKitError else {
            return appleCatalogUnknownErrorStatus
        }
        switch storeKitError {
        case .networkError:
            return appleCatalogNetworkErrorStatus
        case .notAvailableInStorefront:
            return appleCatalogStorefrontUnavailableStatus
        case .notEntitled:
            return appleCatalogNotEntitledStatus
        case .unsupported:
            return appleCatalogUnsupportedStatus
        case .systemError:
            return appleCatalogSystemErrorStatus
        case .unknown:
            return appleCatalogUnknownErrorStatus
        case .userCancelled:
            return appleCatalogUnknownErrorStatus
        @unknown default:
            return appleCatalogUnknownErrorStatus
        }
    }

    private func baseAppleProductCatalogDictionary(
        products: [[String: Any]],
        requestedProductIds: [String],
        missingProductIds: [String],
        status: String
    ) -> [String: Any] {
        let dictionary: [String: Any] = [
            "products": products,
            "missingProductIds": missingProductIds.filter { appleAllowedProductIds.contains($0) },
            "requestedProductCount": requestedProductIds.count,
            "returnedProductCount": products.count,
            "status": status
        ]
        return dictionary
    }

    @available(iOS 15.0, *)
    private func appleProductDictionary(_ product: Product) -> [String: Any] {
        var dictionary: [String: Any] = [
            "productId": product.id,
            "interval": product.id == appleAnnualProductId ? "yearly" : "monthly",
            "displayName": product.displayName,
            "description": product.description,
            "displayPrice": product.displayPrice
        ]
        if let period = product.subscription?.subscriptionPeriod {
            dictionary["subscriptionPeriodUnit"] = appleSubscriptionPeriodUnit(period.unit)
            dictionary["subscriptionPeriodValue"] = period.value
        }
        return dictionary
    }

    @available(iOS 15.0, *)
    private func appleSubscriptionPeriodUnit(_ unit: Product.SubscriptionPeriod.Unit) -> String {
        switch unit {
        case .day:
            return "day"
        case .week:
            return "week"
        case .month:
            return "month"
        case .year:
            return "year"
        @unknown default:
            return "month"
        }
    }

    @available(iOS 15.0, *)
    private func performPurchase(productId: String, config: AppleStoreKitAuthenticatedConfig) async -> AppleStoreKitNativeResult {
        do {
            let context = try await fetchPurchaseContext(config: config)
            guard context.bundleId == Bundle.main.bundleIdentifier, context.allowedProductIds.contains(productId) else {
                return AppleStoreKitNativeResult(status: "productUnavailable")
            }
            guard let appAccountToken = UUID(uuidString: context.appAccountToken) else {
                return AppleStoreKitNativeResult(status: "backendRejected")
            }
            let products = try await Product.products(for: [productId])
            guard let product = products.first(where: { $0.id == productId }) else {
                return AppleStoreKitNativeResult(status: "productUnavailable")
            }
            let purchaseResult = try await product.purchase(options: [.appAccountToken(appAccountToken)])
            switch purchaseResult {
            case .success(let verificationResult):
                switch verificationResult {
                case .verified(let transaction):
                    return await verifyBackendAndHold(
                        transaction: transaction,
                        signedTransactionInfo: verificationResult.jwsRepresentation,
                        config: config
                    )
                case .unverified:
                    return AppleStoreKitNativeResult(status: "unverified")
                }
            case .pending:
                return AppleStoreKitNativeResult(status: "pending")
            case .userCancelled:
                return AppleStoreKitNativeResult(status: "canceled")
            @unknown default:
                return AppleStoreKitNativeResult(status: "failed")
            }
        } catch let error as AppleStoreKitSafeError {
            return AppleStoreKitNativeResult(status: error.status)
        } catch {
            return AppleStoreKitNativeResult(status: "failed")
        }
    }

    @available(iOS 15.0, *)
    private func performRestore(config: AppleStoreKitAuthenticatedConfig) async -> AppleStoreKitNativeResult {
        do {
            try await AppStore.sync()
            return await verifyOutstandingTransactions(config: config)
        } catch {
            return AppleStoreKitNativeResult(status: "failed")
        }
    }

    @available(iOS 15.0, *)
    private func verifyOutstandingTransactions(config: AppleStoreKitAuthenticatedConfig) async -> AppleStoreKitNativeResult {
        var verifiedCount = 0
        var firstFailure: AppleStoreKitNativeResult?
        var seenTransactionIds = Set<UInt64>()

        for await verificationResult in Transaction.unfinished {
            let result = await verifyTransactionResult(verificationResult, config: config, seenTransactionIds: &seenTransactionIds)
            if result.status == "backendVerified" {
                verifiedCount += result.verifiedCount ?? 1
            } else if result.status != "none", firstFailure == nil {
                firstFailure = result
            }
        }

        for await verificationResult in Transaction.currentEntitlements {
            let result = await verifyTransactionResult(verificationResult, config: config, seenTransactionIds: &seenTransactionIds)
            if result.status == "backendVerified" {
                verifiedCount += result.verifiedCount ?? 1
            } else if result.status != "none", firstFailure == nil {
                firstFailure = result
            }
        }

        if verifiedCount > 0 {
            return AppleStoreKitNativeResult(status: "backendVerified", verifiedCount: verifiedCount, requiresEntitlementRefresh: true, clientMayFinishTransaction: true)
        }
        return firstFailure ?? AppleStoreKitNativeResult(status: "none", verifiedCount: 0)
    }

    @available(iOS 15.0, *)
    private func verifyTransactionResult(
        _ verificationResult: VerificationResult<Transaction>,
        config: AppleStoreKitAuthenticatedConfig,
        seenTransactionIds: inout Set<UInt64>
    ) async -> AppleStoreKitNativeResult {
        switch verificationResult {
        case .verified(let transaction):
            guard appleAllowedProductIds.contains(transaction.productID), !seenTransactionIds.contains(transaction.id) else {
                return AppleStoreKitNativeResult(status: "none")
            }
            seenTransactionIds.insert(transaction.id)
            return await verifyBackendAndHold(
                transaction: transaction,
                signedTransactionInfo: verificationResult.jwsRepresentation,
                config: config
            )
        case .unverified(let transaction, _):
            if appleAllowedProductIds.contains(transaction.productID) {
                return AppleStoreKitNativeResult(status: "unverified")
            }
            return AppleStoreKitNativeResult(status: "none")
        }
    }

    @available(iOS 15.0, *)
    private func verifyBackendAndHold(
        transaction: Transaction,
        signedTransactionInfo: String,
        config: AppleStoreKitAuthenticatedConfig
    ) async -> AppleStoreKitNativeResult {
        guard appleAllowedProductIds.contains(transaction.productID) else {
            return AppleStoreKitNativeResult(status: "productUnavailable")
        }

        do {
            let response: AppleVerifyResponse = try await postFunction(
                "apple-purchase-verify",
                body: ["signedTransactionInfo": signedTransactionInfo, "signedRenewalInfo": NSNull()],
                config: config
            )
            guard response.ok == true, response.clientMayFinishTransaction != false else {
                return AppleStoreKitNativeResult(status: "backendRejected")
            }
            await pendingTransactions.remember(transaction)
            return AppleStoreKitNativeResult(status: "backendVerified", verifiedCount: 1, requiresEntitlementRefresh: true, clientMayFinishTransaction: true)
        } catch let error as AppleStoreKitSafeError {
            return AppleStoreKitNativeResult(status: error.status)
        } catch {
            return AppleStoreKitNativeResult(status: "backendUnavailable")
        }
    }

    private func fetchPurchaseContext(config: AppleStoreKitAuthenticatedConfig) async throws -> ApplePurchaseContextResponse {
        let response: ApplePurchaseContextResponse = try await postFunction("apple-purchase-context", body: [:], config: config)
        if response.appAccountToken.isEmpty || response.bundleId.isEmpty || response.allowedProductIds.isEmpty {
            throw AppleStoreKitSafeError(status: "backendRejected")
        }
        return response
    }

    private func postFunction<T: Decodable>(_ functionName: String, body: [String: Any], config: AppleStoreKitAuthenticatedConfig) async throws -> T {
        guard var url = URL(string: config.supabaseUrl), url.scheme == "https" || url.scheme == "http" else {
            throw AppleStoreKitSafeError(status: "backendRejected")
        }
        url.appendPathComponent("functions")
        url.appendPathComponent("v1")
        url.appendPathComponent(functionName)

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "accept")
        request.setValue("application/json", forHTTPHeaderField: "content-type")
        request.setValue(config.anonKey, forHTTPHeaderField: "apikey")
        request.setValue("Bearer \(config.accessToken)", forHTTPHeaderField: "authorization")
        request.httpBody = try JSONSerialization.data(withJSONObject: body, options: [])

        let (data, response) = try await URLSession.shared.data(for: request)
        guard let httpResponse = response as? HTTPURLResponse else {
            throw AppleStoreKitSafeError(status: "backendUnavailable")
        }
        guard (200..<300).contains(httpResponse.statusCode) else {
            throw AppleStoreKitSafeError(status: statusForFunctionFailure(httpResponse.statusCode))
        }
        return try JSONDecoder().decode(T.self, from: data)
    }

    private func statusForFunctionFailure(_ statusCode: Int) -> String {
        if statusCode == 401 {
            return "requiresSignIn"
        }
        if statusCode == 403 || statusCode == 409 {
            return "accountConflict"
        }
        if statusCode == 503 || statusCode >= 500 {
            return "backendUnavailable"
        }
        return "backendRejected"
    }
}

private struct AppleStoreKitAuthenticatedConfig {
    let supabaseUrl: String
    let anonKey: String
    let accessToken: String

    init?(call: CAPPluginCall) {
        guard
            let supabaseUrl = call.getString("supabaseUrl")?.trimmingCharacters(in: .whitespacesAndNewlines),
            let anonKey = call.getString("anonKey")?.trimmingCharacters(in: .whitespacesAndNewlines),
            let accessToken = call.getString("accessToken")?.trimmingCharacters(in: .whitespacesAndNewlines),
            !supabaseUrl.isEmpty,
            !anonKey.isEmpty,
            !accessToken.isEmpty
        else {
            return nil
        }
        self.supabaseUrl = supabaseUrl
        self.anonKey = anonKey
        self.accessToken = accessToken
    }
}

private struct ApplePurchaseContextResponse: Decodable {
    let appAccountToken: String
    let bundleId: String
    let appAppleId: String
    let environment: String
    let allowedProductIds: [String]
}

private struct AppleVerifyResponse: Decodable {
    let ok: Bool?
    let status: String?
    let entitlementRefreshRecommended: Bool?
    let clientMayFinishTransaction: Bool?
}

private struct AppleStoreKitSafeError: Error {
    let status: String
}

private struct AppleStoreKitNativeResult {
    let status: String
    let verifiedCount: Int?
    let requiresEntitlementRefresh: Bool
    let clientMayFinishTransaction: Bool

    init(
        status: String,
        verifiedCount: Int? = nil,
        requiresEntitlementRefresh: Bool = false,
        clientMayFinishTransaction: Bool = false
    ) {
        self.status = status
        self.verifiedCount = verifiedCount
        self.requiresEntitlementRefresh = requiresEntitlementRefresh
        self.clientMayFinishTransaction = clientMayFinishTransaction
    }

    var dictionary: [String: Any] {
        var value: [String: Any] = [
            "status": status,
            "requiresEntitlementRefresh": requiresEntitlementRefresh,
            "clientMayFinishTransaction": clientMayFinishTransaction
        ]
        if let verifiedCount {
            value["verifiedCount"] = verifiedCount
        }
        return value
    }
}

@available(iOS 15.0, *)
private actor AppleStoreKitPendingTransactionStore {
    private var transactions: [UInt64: Transaction] = [:]

    func remember(_ transaction: Transaction) {
        transactions[transaction.id] = transaction
    }

    func finishAll() async -> Int {
        let pending = Array(transactions.values)
        transactions.removeAll()
        for transaction in pending {
            await transaction.finish()
        }
        return pending.count
    }
}
