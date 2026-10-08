# Move support chat and fix phrase-warning layering

## Changes

- Move the floating support control from the top-left to the bottom-right of every page.
- Keep it fixed in that corner while the user scrolls.
- Show only the support message icon while closed, including the unread-count badge when needed.
- Show the support text, messages, and reply box only after the icon is clicked.
- Keep the open chat panel anchored above the bottom-right icon and constrained to the screen on smaller devices.
- Move the recovery-phrase warning into a top-level page layer so its backdrop, warning text, checkbox, and buttons always appear in front of the wallet balance and navigation.
- Keep the existing warning wording, checkbox requirement, support action, and six-second phrase timer unchanged.

## Verification

- Check the wallet page while scrolled to confirm the support icon remains at the bottom-right.
- Open and close the chat on desktop and mobile-sized screens.
- Open the recovery-phrase warning and confirm every part appears above the balance section and remains usable.
- Confirm the preview reports a successful build after the changes.

## Technical details

- Update only the support-chat positioning/closed state and the phrase-warning mounting/layering.
- Render the phrase warning through a document-level portal with a higher layer than other fixed interface elements, while preserving server-side rendering safety.
