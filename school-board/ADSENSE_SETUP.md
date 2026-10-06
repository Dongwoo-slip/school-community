# Google AdSense setup

This project is prepared for a left-side vertical AdSense display ad.

## Required Vercel environment variables

```env
NEXT_PUBLIC_GOOGLE_ADSENSE_CLIENT_ID=ca-pub-0000000000000000
NEXT_PUBLIC_GOOGLE_ADSENSE_LEFT_SLOT_ID=0000000000
GOOGLE_ADSENSE_PUBLISHER_ID=pub-0000000000000000
```

`GOOGLE_ADSENSE_PUBLISHER_ID` is optional when `NEXT_PUBLIC_GOOGLE_ADSENSE_CLIENT_ID`
is present, because `/ads.txt` can derive `pub-...` from `ca-pub-...`.

## AdSense dashboard steps

1. Add `https://squarecj.com` as a site in Google AdSense.
2. Copy the publisher/client id that looks like `ca-pub-...`.
3. Create a Display ad unit for the left vertical banner.
4. Copy the ad slot id from the generated ad code.
5. Add the variables above in Vercel Production environment.
6. Redeploy the site.
7. Confirm these URLs:
   - `https://squarecj.com/ads.txt`
   - `https://squarecj.com/community/free`

The app loads Google AdSense only when the client id is configured. Until then,
the existing custom left banner system remains active.
