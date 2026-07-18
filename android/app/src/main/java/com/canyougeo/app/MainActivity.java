package com.canyougeo.app;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    private final PlayBillingBootstrap playBillingBootstrap = new PlayBillingBootstrap();

    @Override
    public void onStart() {
        super.onStart();
        playBillingBootstrap.start(this);
    }

    @Override
    public void onStop() {
        playBillingBootstrap.stop();
        super.onStop();
    }
}
