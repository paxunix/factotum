# Factotum

User-defined commands for Chrome.

Remember Ubiquity for Firefox?  It was a CLI-addict's dream.  When I left
Firefox behind in favour of Chrome, I really, really missed Ubiquity.

This is my attempt at making something similar, though probably without
goals quite so lofty, and without a custom API (at least at this time).

It is a work in progress and has extremely sharp edges.

**Be aware that you can fuck up your computer and your life quite badly with
this extension.  It allows Chrome to execute arbitrary code with full
privileges.  This means a thoughtlessly-executed command line running a
suspiciously-written Fcommand can do things like:**

**1. Send all your porn bookmarks to your employer.**

**2. Email your bank-account information to North Korean hackers.**

**3. Render your computer completely unusable.**

**This extension is intended for developers and people who understand not
only Javascript, but probably Chrome extensions as well.**

**I'm not joking.  Do not fuck around with this unless you know what you are
doing.  If you shoot yourself in the face, don't come crying to the person
who gave you a free gun full of free bullets.**


## Setting up a local package

1. Install [Node.js](http://nodejs.org/download/) if you don't already have it.
1. Run `make setup`.
1. Then run `make`.
1. Enable developer mode in <chrome://extensions/>.
1. Click on the *Load unpacked extension...* button and select the directory
   containing `manifest.json`.
1. As of 2014-12-20, there is a built-in Factotum command (an Fcommand) that
   loads jQuery into the current page.  Enter `f loadjq` into Chrome's
   omnibox and if you're not on a `chrome://` or `about://` page, jQuery
   will be loaded and you should get a notification after a few seconds that
   says which jQuery version it is.

## Modifying stuff

* After making changes, re-run `make` and then reload the extensions page.
  Depending on your changes, you may need to reload pages that now have an
  old version of the content and injected scripts.

* Alternatively, if you just want it to auto-build when a file is modified,
  run `make watchify` (remember to `make kill` if you wish to kill off the
  watchers).  Then all you have to do is make changes, wait a couple
  seconds, then reload the extensions page, etc.

* Take a look at `example/load-jquery.html` to see what goes into writing an
  Fcommand.
