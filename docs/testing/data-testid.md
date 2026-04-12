# Recommended `data-testid` Attributes

Add these to your Astro components to enable stable Playwright selectors.
Selectors tied to CSS classes or text content break when copy/styles change.
`data-testid` attributes are invisible to users and stable across refactors.

## BookingWidget.astro — `src/components/listing/BookingWidget.astro`

| Element | Recommended `data-testid` | Reason |
|---------|--------------------------|--------|
| Widget root container | `booking-widget` | Allows POM to scope all child queries |
| Check-in date input | `widget-check-in` | Dates are the primary booking inputs |
| Check-out date input | `widget-check-out` | Required for price calculation |
| Guests counter / select | `widget-guests` | Affects pricing and availability |
| Price total display | `booking-price-total` | Asserted in E2E pricing tests |
| "Book Now" / CTA button | `booking-cta` | Most critical button on the page |
| Cleaning fee line | `booking-cleaning-fee` | Breakdownverification |
| Extra guest fee line | `booking-extra-guest-fee` | Boundary condition testing |
| Season modifier badge | `booking-season-modifier` | Price accuracy verification |
| Coupon discount line | `booking-coupon-discount` | Coupon flow testing |
| Minimum nights message | `booking-min-nights-msg` | Validation messaging |

```astro
<!-- Example usage -->
<div data-testid="booking-widget">
  <input data-testid="widget-check-in" type="date" name="check_in" />
  <input data-testid="widget-check-out" type="date" name="check_out" />
  <select data-testid="widget-guests" name="guests">...</select>
  <span data-testid="booking-price-total">{formatPrice(total)}</span>
  <a data-testid="booking-cta" href={bookUrl}>Book Now</a>
</div>
```

---

## AvailabilityCalendar.astro — `src/components/listing/AvailabilityCalendar.astro`

| Element | Recommended `data-testid` | Reason |
|---------|--------------------------|--------|
| Calendar root | `availability-calendar` | Scope all calendar queries |
| Month/year heading | `calendar-month-label` | Verify correct month displayed |
| Previous month button | `calendar-prev` | Navigation testing |
| Next month button | `calendar-next` | Navigation testing |
| Individual date cell | `calendar-day-{YYYY-MM-DD}` | Click specific dates in E2E tests |
| Unavailable date indicator | `calendar-day-unavailable` | Validate blocked dates are shown |
| Today indicator | `calendar-day-today` | Boundary — today should not be bookable |

```astro
<div data-testid="availability-calendar">
  <button data-testid="calendar-prev">←</button>
  <span data-testid="calendar-month-label">{monthLabel}</span>
  <button data-testid="calendar-next">→</button>
  {days.map(day => (
    <button
      data-testid={`calendar-day-${day.date}`}
      class:list={{ unavailable: !day.available }}
      aria-label={day.date}
    >{day.dayNum}</button>
  ))}
</div>
```

---

## Gallery.astro — `src/components/listing/Gallery.astro`

| Element | Recommended `data-testid` | Reason |
|---------|--------------------------|--------|
| Gallery root | `gallery-root` | Scope queries |
| Cover / hero image | `gallery-cover` | Verify first image loads |
| Thumbnail grid | `gallery-thumbnails` | Check count of images |
| Individual thumbnail | `gallery-thumb-{index}` | Click-to-expand tests |
| Lightbox overlay | `gallery-lightbox` | Verify lightbox opens |
| Lightbox close button | `gallery-lightbox-close` | Accessibility — close via keyboard |
| Image counter | `gallery-counter` | "3 / 8" display verification |

---

## ListingCard.astro — `src/components/listing/ListingCard.astro`

| Element | Recommended `data-testid` | Reason |
|---------|--------------------------|--------|
| Card root | `listing-card` | Count cards, scope child queries |
| Card link (whole card) | `listing-card-link` | Click navigation testing |
| Listing title | `listing-card-title` | Verify title rendering |
| Price per night | `listing-card-price` | Verify price is displayed |
| Guest count | `listing-card-guests` | Verify capacity info |
| Bedroom count | `listing-card-bedrooms` | Verify room info |
| Cover photo | `listing-card-image` | Verify image loads |
| Rating display | `listing-card-rating` | Verify rating shown |
| "View Details" CTA | `listing-card-cta` | Filter CTA clicks |
| "Available" / date badge | `listing-card-availability` | Filter/dates flow |

```astro
<article data-testid="listing-card">
  <a data-testid="listing-card-link" href={`/villas/${slug}`}>
    <img data-testid="listing-card-image" src={cover} alt={title} />
    <h2 data-testid="listing-card-title">{title}</h2>
    <span data-testid="listing-card-price">€{base_price}/night</span>
    <span data-testid="listing-card-guests">{max_guests} guests</span>
    <span data-testid="listing-card-bedrooms">{bedrooms} bedrooms</span>
  </a>
</article>
```

---

## Header.astro — `src/components/shared/Header.astro`

| Element | Recommended `data-testid` | Reason |
|---------|--------------------------|--------|
| Header root | `site-header` | Scope all header queries |
| Logo link | `header-logo` | Verify home navigation |
| Nav rentals link | `nav-rentals` | Verify nav links present |
| Nav about link | `nav-about` | Verify nav links present |
| Nav contact link | `nav-contact` | Verify nav links present |
| Nav FAQ link | `nav-faq` | Verify nav links present |
| Mobile hamburger | `nav-mobile-open` | Mobile navigation testing |
| Mobile menu overlay | `nav-mobile-menu` | Verify menu opens on mobile |
| Mobile close button | `nav-mobile-close` | Verify menu closes |

---

## Footer.astro — `src/components/shared/Footer.astro`

| Element | Recommended `data-testid` | Reason |
|---------|--------------------------|--------|
| Footer root | `site-footer` | Scope all footer queries |
| Contact email link | `footer-email` | Verify correct email shown |
| Privacy policy link | `footer-privacy` | Verify policy link present |
| Terms link | `footer-terms` | Verify terms link present |
| Copyright text | `footer-copyright` | Verify year/brand shown |
| Social links container | `footer-social` | Social link verification |

---

## LanguageSwitcher.astro — `src/components/shared/LanguageSwitcher.astro`

| Element | Recommended `data-testid` | Reason |
|---------|--------------------------|--------|
| Switcher root | `lang-switcher` | Scope queries, detect presence |
| Current language button/display | `lang-current` | Assert active language |
| Language option: en | `lang-option-en` | Click to switch language |
| Language option: el | `lang-option-el` | Click to switch language |
| Language option: bg | `lang-option-bg` | Click to switch language |
| Language option: ro | `lang-option-ro` | Click to switch language |
| Language option: tr | `lang-option-tr` | Click to switch language |

```astro
<div data-testid="lang-switcher">
  <button data-testid="lang-current">{LANG_FLAGS[currentLang]}</button>
  {SUPPORTED_LANGS.map(lang => (
    <a data-testid={`lang-option-${lang}`} href={`?lang=${lang}`}>
      {LANG_FLAGS[lang]} {LANG_LABELS[lang]}
    </a>
  ))}
</div>
```

---

## contact.astro — `src/pages/contact.astro`

| Element | Recommended `data-testid` | Reason |
|---------|--------------------------|--------|
| Contact form root | `contact-form` | Scope form queries |
| Name input | `contact-name` | Fill form in E2E |
| Email input | `contact-email` | Fill form in E2E |
| Phone input | `contact-phone` | Fill form in E2E |
| Message textarea | `contact-message` | Fill form in E2E |
| Submit button | `contact-submit` | Trigger submission |
| Success message | `contact-success` | Assert success state |
| Error message | `contact-error` | Assert error state |
| Contact info section | `contact-info` | Verify email/phone shown |

---

## admin/login.astro — `src/pages/admin/login.astro`

| Element | Recommended `data-testid` | Reason |
|---------|--------------------------|--------|
| Login form | `login-form` | Scope form queries |
| Email input | `login-email` | Fill credentials in E2E |
| Password input | `login-password` | Fill credentials in E2E |
| Submit button | `login-submit` | Trigger login |
| Error message | `login-error` | Assert invalid credentials |

---

## admin/coupons.astro — `src/pages/admin/coupons.astro`

| Element | Recommended `data-testid` | Reason |
|---------|--------------------------|--------|
| Coupon table/list | `coupons-list` | Count/verify coupons |
| Individual coupon row | `coupon-row` | Per-coupon assertions |
| Coupon code display | `coupon-code` | Verify code shown |
| Toggle active button | `coupon-toggle` | Test enable/disable |
| Delete button | `coupon-delete` | Test deletion flow |
| Create new coupon button | `coupon-create-btn` | Open creation form |
| Creation form | `coupon-create-form` | Scope form queries |
| Code input | `coupon-input-code` | Fill code |
| Discount type select | `coupon-input-type` | Select type |
| Discount value input | `coupon-input-value` | Fill value |
| Submit create | `coupon-submit` | Trigger creation |

---

## book/[listingId].astro — `src/pages/book/[listingId].astro`

| Element | Recommended `data-testid` | Reason |
|---------|--------------------------|--------|
| Booking form | `booking-form` | Scope all form queries |
| Guest name input | `book-guest-name` | Fill booking form |
| Guest email input | `book-guest-email` | Fill booking form |
| Dial code selector | `book-dial-code` | International phone |
| Phone number input | `book-phone-number` | Fill booking form |
| Payment method: Stripe | `book-pay-stripe` | Select payment method |
| Payment method: Bank | `book-pay-bank` | Select payment method |
| Payment plan: Full | `book-plan-full` | Select payment plan |
| Payment plan: Deposit | `book-plan-deposit` | Deposit flow testing |
| Hidden payment_type input | `book-payment-type-hidden` | Assert correct value submitted |
| Deposit amount display | `book-deposit-amount` | Verify deposit shown |
| Remaining amount display | `book-remaining-amount` | Verify remaining shown |
| Price total | `book-price-total` | Verify total price |
| Submit button | `book-submit` | Trigger booking |
| Error message | `book-error` | Assert error states |
| Success redirect trigger | `book-success` | Verify success flow |
