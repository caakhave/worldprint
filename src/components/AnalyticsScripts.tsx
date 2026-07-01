import Script from "next/script";
import { analyticsConfigFromEnv } from "@/lib/site/analytics";

export function AnalyticsScripts() {
  const config = analyticsConfigFromEnv();
  if (!config.enabled) return null;

  if (config.provider === "gtm" && config.gtmId) {
    return (
      <>
        <Script id="cgy-gtm-init" data-testid="cgy-gtm-init" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            window.dataLayer.push({ 'gtm.start': new Date().getTime(), event: 'gtm.js' });
            (function(w,d,s,l,i){var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${config.gtmId}');
          `}
        </Script>
        <noscript>
          <iframe
            title="Google Tag Manager"
            src={`https://www.googletagmanager.com/ns.html?id=${config.gtmId}`}
            height="0"
            width="0"
            style={{ display: "none", visibility: "hidden" }}
          />
        </noscript>
      </>
    );
  }

  if (config.provider === "ga4" && config.gaMeasurementId) {
    return (
      <>
        <Script
          id="cgy-ga4-src"
          data-testid="cgy-ga4-src"
          src={`https://www.googletagmanager.com/gtag/js?id=${config.gaMeasurementId}`}
          strategy="afterInteractive"
        />
        <Script id="cgy-ga4-init" data-testid="cgy-ga4-init" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${config.gaMeasurementId}', { send_page_view: true });
          `}
        </Script>
      </>
    );
  }

  return null;
}
