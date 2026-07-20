package com.canyougeo.app;

import android.app.Activity;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;

import com.android.billingclient.api.BillingClient;
import com.android.billingclient.api.BillingClientStateListener;
import com.android.billingclient.api.BillingFlowParams;
import com.android.billingclient.api.BillingResult;
import com.android.billingclient.api.PendingPurchasesParams;
import com.android.billingclient.api.ProductDetails;
import com.android.billingclient.api.Purchase;
import com.android.billingclient.api.QueryProductDetailsParams;
import com.android.billingclient.api.QueryPurchasesParams;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@CapacitorPlugin(name = "GooglePlayBilling")
public class GooglePlayBillingPlugin extends Plugin {
    private static final String PRODUCT_ID = "canyougeo_pro";
    private static final String BASE_PLAN_MONTHLY = "monthly";
    private static final String BASE_PLAN_ANNUAL = "annual";

    private BillingClient billingClient;
    private boolean connecting;
    private int subscriptionsSupportCode = BillingClient.BillingResponseCode.FEATURE_NOT_SUPPORTED;
    private final List<ReadyAction> readyActions = new ArrayList<>();
    private final Map<String, ProductDetails> productDetailsById = new HashMap<>();
    private final Map<String, ProductDetails.SubscriptionOfferDetails> offerDetailsByBasePlanId = new HashMap<>();

    @PluginMethod
    public void isAvailable(PluginCall call) {
        withReady(call, new ReadyAction() {
            @Override
            public void onReady(@NonNull BillingClient client) {
                JSObject result = new JSObject();
                result.put("available", subscriptionsSupportCode == BillingClient.BillingResponseCode.OK);
                result.put("responseCode", subscriptionsSupportCode);
                call.resolve(result);
            }

            @Override
            public void onUnavailable(@NonNull BillingResult billingResult) {
                JSObject result = new JSObject();
                result.put("available", false);
                result.put("responseCode", billingResult.getResponseCode());
                call.resolve(result);
            }
        });
    }

    @PluginMethod
    public void queryProducts(PluginCall call) {
        String productId = call.getString("productId", PRODUCT_ID);
        if (!PRODUCT_ID.equals(productId)) {
            call.reject("Unsupported product.");
            return;
        }

        withReady(call, new ReadyAction() {
            @Override
            public void onReady(@NonNull BillingClient client) {
                QueryProductDetailsParams.Product product = QueryProductDetailsParams.Product.newBuilder()
                        .setProductId(PRODUCT_ID)
                        .setProductType(BillingClient.ProductType.SUBS)
                        .build();
                QueryProductDetailsParams params = QueryProductDetailsParams.newBuilder()
                        .setProductList(singletonProductList(product))
                        .build();
                client.queryProductDetailsAsync(params, (billingResult, productDetailsResult) -> {
                    if (billingResult.getResponseCode() != BillingClient.BillingResponseCode.OK) {
                        call.reject("Google Play catalog is unavailable.");
                        return;
                    }
                    productDetailsById.clear();
                    offerDetailsByBasePlanId.clear();
                    JSArray plans = new JSArray();
                    for (ProductDetails details : productDetailsResult.getProductDetailsList()) {
                        productDetailsById.put(details.getProductId(), details);
                        List<ProductDetails.SubscriptionOfferDetails> offers = details.getSubscriptionOfferDetails();
                        if (offers == null) continue;
                        for (ProductDetails.SubscriptionOfferDetails offer : offers) {
                            String basePlanId = offer.getBasePlanId();
                            if (!isAllowedBasePlan(basePlanId) || offer.getOfferId() != null || offer.getInstallmentPlanDetails() != null) {
                                continue;
                            }
                            offerDetailsByBasePlanId.put(basePlanId, offer);
                            plans.put(planObject(details, offer));
                        }
                    }
                    JSObject result = new JSObject();
                    result.put("productId", PRODUCT_ID);
                    result.put("plans", plans);
                    call.resolve(result);
                });
            }

            @Override
            public void onUnavailable(@NonNull BillingResult billingResult) {
                call.reject("Google Play Billing is unavailable.");
            }
        });
    }

    @PluginMethod
    public void launchPurchase(PluginCall call) {
        String productId = call.getString("productId", "");
        String basePlanId = call.getString("basePlanId", "");
        String obfuscatedAccountId = call.getString("obfuscatedAccountId", "");
        if (!PRODUCT_ID.equals(productId) || !isAllowedBasePlan(basePlanId)) {
            call.reject("Unsupported product.");
            return;
        }
        if (!isValidObfuscatedAccountId(obfuscatedAccountId)) {
            call.reject("Purchase context is invalid.");
            return;
        }

        withReady(call, new ReadyAction() {
            @Override
            public void onReady(@NonNull BillingClient client) {
                ProductDetails details = productDetailsById.get(PRODUCT_ID);
                ProductDetails.SubscriptionOfferDetails offer = offerDetailsByBasePlanId.get(basePlanId);
                if (details == null || offer == null) {
                    call.reject("Google Play catalog is not ready.");
                    return;
                }
                BillingFlowParams.ProductDetailsParams productDetailsParams = BillingFlowParams.ProductDetailsParams.newBuilder()
                        .setProductDetails(details)
                        .setOfferToken(offer.getOfferToken())
                        .build();
                BillingFlowParams params = BillingFlowParams.newBuilder()
                        .setProductDetailsParamsList(singletonBillingFlowList(productDetailsParams))
                        .setObfuscatedAccountId(obfuscatedAccountId)
                        .build();
                Activity activity = getActivity();
                if (activity == null) {
                    call.reject("Google Play Billing is unavailable.");
                    return;
                }
                BillingResult result = client.launchBillingFlow(activity, params);
                if (result.getResponseCode() != BillingClient.BillingResponseCode.OK) {
                    call.reject("Google Play purchase could not start.");
                    return;
                }
                JSObject response = new JSObject();
                response.put("status", "launched");
                call.resolve(response);
            }

            @Override
            public void onUnavailable(@NonNull BillingResult billingResult) {
                call.reject("Google Play Billing is unavailable.");
            }
        });
    }

    @PluginMethod
    public void restorePurchases(PluginCall call) {
        withReady(call, new ReadyAction() {
            @Override
            public void onReady(@NonNull BillingClient client) {
                QueryPurchasesParams params = QueryPurchasesParams.newBuilder()
                        .setProductType(BillingClient.ProductType.SUBS)
                        .build();
                client.queryPurchasesAsync(params, (billingResult, purchases) -> {
                    if (billingResult.getResponseCode() != BillingClient.BillingResponseCode.OK) {
                        call.reject("Google Play purchases could not be restored.");
                        return;
                    }
                    JSObject result = new JSObject();
                    result.put("purchases", purchasesArray(purchases));
                    call.resolve(result);
                });
            }

            @Override
            public void onUnavailable(@NonNull BillingResult billingResult) {
                call.reject("Google Play Billing is unavailable.");
            }
        });
    }

    @Override
    protected void handleOnDestroy() {
        BillingClient currentClient = billingClient;
        billingClient = null;
        connecting = false;
        readyActions.clear();
        if (currentClient != null) {
            currentClient.endConnection();
        }
        super.handleOnDestroy();
    }

    private void withReady(@NonNull PluginCall call, @NonNull ReadyAction action) {
        Activity activity = getActivity();
        if (activity == null) {
            action.onUnavailable(unavailableResult());
            return;
        }
        activity.runOnUiThread(() -> {
            BillingClient client = ensureBillingClient();
            if (client.isReady()) {
                subscriptionsSupportCode = client.isFeatureSupported(BillingClient.FeatureType.SUBSCRIPTIONS).getResponseCode();
                action.onReady(client);
                return;
            }
            readyActions.add(action);
            if (connecting) return;
            connecting = true;
            client.startConnection(new BillingClientStateListener() {
                @Override
                public void onBillingSetupFinished(@NonNull BillingResult billingResult) {
                    connecting = false;
                    List<ReadyAction> actions = new ArrayList<>(readyActions);
                    readyActions.clear();
                    if (billingResult.getResponseCode() != BillingClient.BillingResponseCode.OK) {
                        for (ReadyAction queuedAction : actions) {
                            queuedAction.onUnavailable(billingResult);
                        }
                        return;
                    }
                    subscriptionsSupportCode = client.isFeatureSupported(BillingClient.FeatureType.SUBSCRIPTIONS).getResponseCode();
                    if (subscriptionsSupportCode != BillingClient.BillingResponseCode.OK) {
                        for (ReadyAction queuedAction : actions) {
                            queuedAction.onUnavailable(billingResult);
                        }
                        return;
                    }
                    for (ReadyAction queuedAction : actions) {
                        queuedAction.onReady(client);
                    }
                }

                @Override
                public void onBillingServiceDisconnected() {
                    connecting = false;
                }
            });
        });
    }

    private BillingClient ensureBillingClient() {
        if (billingClient != null) return billingClient;
        billingClient = BillingClient.newBuilder(getContext().getApplicationContext())
                .setListener((billingResult, purchases) -> notifyPurchaseUpdate(billingResult, purchases))
                .enablePendingPurchases(
                        PendingPurchasesParams.newBuilder()
                                .enableOneTimeProducts()
                                .build()
                )
                .enableAutoServiceReconnection()
                .build();
        return billingClient;
    }

    private void notifyPurchaseUpdate(@NonNull BillingResult billingResult, @Nullable List<Purchase> purchases) {
        JSObject result = new JSObject();
        result.put("responseCode", billingResult.getResponseCode());
        result.put("purchases", purchasesArray(purchases));
        notifyListeners("purchaseUpdated", result);
    }

    private JSArray purchasesArray(@Nullable List<Purchase> purchases) {
        JSArray array = new JSArray();
        if (purchases == null) return array;
        for (Purchase purchase : purchases) {
            JSObject item = new JSObject();
            item.put("productId", firstProductId(purchase));
            item.put("purchaseToken", purchase.getPurchaseToken());
            item.put("purchaseState", purchase.getPurchaseState());
            item.put("acknowledged", purchase.isAcknowledged());
            if (purchase.getAccountIdentifiers() != null) {
                item.put("obfuscatedAccountId", purchase.getAccountIdentifiers().getObfuscatedAccountId());
            }
            array.put(item);
        }
        return array;
    }

    private JSObject planObject(@NonNull ProductDetails details, @NonNull ProductDetails.SubscriptionOfferDetails offer) {
        ProductDetails.PricingPhase phase = firstPricingPhase(offer);
        JSObject plan = new JSObject();
        plan.put("productId", details.getProductId());
        plan.put("basePlanId", offer.getBasePlanId());
        plan.put("title", details.getTitle());
        plan.put("name", details.getName());
        if (phase != null) {
            plan.put("localizedPrice", phase.getFormattedPrice());
            plan.put("currencyCode", phase.getPriceCurrencyCode());
            plan.put("priceAmountMicros", phase.getPriceAmountMicros());
            plan.put("billingPeriod", phase.getBillingPeriod());
        }
        return plan;
    }

    @Nullable
    private ProductDetails.PricingPhase firstPricingPhase(@NonNull ProductDetails.SubscriptionOfferDetails offer) {
        if (offer.getPricingPhases() == null) return null;
        List<ProductDetails.PricingPhase> phases = offer.getPricingPhases().getPricingPhaseList();
        if (phases == null || phases.isEmpty()) return null;
        return phases.get(0);
    }

    private String firstProductId(@NonNull Purchase purchase) {
        List<String> products = purchase.getProducts();
        if (products == null || products.isEmpty()) return "";
        return products.get(0);
    }

    private boolean isAllowedBasePlan(@Nullable String basePlanId) {
        return BASE_PLAN_MONTHLY.equals(basePlanId) || BASE_PLAN_ANNUAL.equals(basePlanId);
    }

    private boolean isValidObfuscatedAccountId(@Nullable String value) {
        return value != null && value.matches("^[a-f0-9]{64}$");
    }

    private List<QueryProductDetailsParams.Product> singletonProductList(QueryProductDetailsParams.Product product) {
        List<QueryProductDetailsParams.Product> list = new ArrayList<>();
        list.add(product);
        return list;
    }

    private List<BillingFlowParams.ProductDetailsParams> singletonBillingFlowList(BillingFlowParams.ProductDetailsParams params) {
        List<BillingFlowParams.ProductDetailsParams> list = new ArrayList<>();
        list.add(params);
        return list;
    }

    private BillingResult unavailableResult() {
        return BillingResult.newBuilder()
                .setResponseCode(BillingClient.BillingResponseCode.SERVICE_UNAVAILABLE)
                .build();
    }

    private interface ReadyAction {
        void onReady(@NonNull BillingClient client);

        void onUnavailable(@NonNull BillingResult billingResult);
    }
}
