package com.canyougeo.app;

import android.content.Context;

import com.android.billingclient.api.BillingClient;
import com.android.billingclient.api.BillingClientStateListener;
import com.android.billingclient.api.BillingResult;
import com.android.billingclient.api.PendingPurchasesParams;

final class PlayBillingBootstrap {
    private BillingClient billingClient;
    private boolean billingReady;
    private int subscriptionsSupportCode = BillingClient.BillingResponseCode.FEATURE_NOT_SUPPORTED;

    void start(Context context) {
        if (billingClient != null) {
            return;
        }

        try {
            BillingClient client = BillingClient.newBuilder(context.getApplicationContext())
                    .setListener((billingResult, purchases) -> {
                        // Purchase handling is intentionally deferred until server verification exists.
                    })
                    .enablePendingPurchases(
                            PendingPurchasesParams.newBuilder()
                                    .enableOneTimeProducts()
                                    .build()
                    )
                    .enableAutoServiceReconnection()
                    .build();
            billingClient = client;
            client.startConnection(new BillingClientStateListener() {
                @Override
                public void onBillingSetupFinished(BillingResult billingResult) {
                    BillingClient currentClient = billingClient;
                    billingReady = billingResult.getResponseCode() == BillingClient.BillingResponseCode.OK;
                    if (!billingReady || currentClient == null) {
                        return;
                    }

                    BillingResult subscriptionsResult = currentClient.isFeatureSupported(BillingClient.FeatureType.SUBSCRIPTIONS);
                    subscriptionsSupportCode = subscriptionsResult.getResponseCode();
                }

                @Override
                public void onBillingServiceDisconnected() {
                    billingReady = false;
                }
            });
        } catch (RuntimeException ignored) {
            billingClient = null;
            billingReady = false;
        }
    }

    void stop() {
        BillingClient currentClient = billingClient;
        billingClient = null;
        billingReady = false;
        if (currentClient == null) {
            return;
        }

        try {
            currentClient.endConnection();
        } catch (RuntimeException ignored) {
            // Closing billing should never prevent the app from stopping cleanly.
        }
    }

    boolean isBillingReady() {
        return billingReady;
    }

    int getSubscriptionsSupportCode() {
        return subscriptionsSupportCode;
    }
}
