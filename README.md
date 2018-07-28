# Factotum

User-defined commands for Chrome.

Remember [Ubiquity](https://wiki.mozilla.org/Labs/Ubiquity) for Firefox?  It
was a CLI-addict's dream.  When I left Firefox behind in favour of Chrome, I
really, really missed Ubiquity.

This is my attempt at making something similar and hopefully better, though
definitely without goals quite so lofty:  there's no attempt at
natural-language parsing (nor do I ever want there to be), and it has no
custom API to make the writing of a Factotum Command (i.e. Fcommand) easier
or prettier.  If anything, it generally adheres to the early Soviet space
program's design sensibilities:  utterly spare interface, myriad sharp
edges, and no concessions to beauty (it would be made of concrete and steel
if those things were available via Chrome API).  This extension is for
people who type in a command and want the same thing to happen every time.

Most importantly, it is a work in progress, as it is also a test-bed for me
to muck around with fancy new HTML5 features that Chrome has been
accumulating.

**Be aware that you can fuck up your computer and possibly your life quite
badly with this extension.  It allows Chrome to execute arbitrary code with
full privileges.  This means a thoughtlessly-executed command line running a
suspiciously-written Fcommand can do things like:**

1. **Send all your porn bookmarks to your employer.**
2. **Email your bank-account information to North Korean hackers.**
3. **Render your computer completely unusable.**

**This extension is intended for developers and people who understand not
only Javascript, but probably Chrome extensions as well.**

**I'm not joking.  Do not fuck around with this unless you know what you are
doing.  If you shoot yourself in the face, don't come crying to the person
who gave you a free gun full of free bullets.**


## Setting up a local package

1. Install [Node.js](http://nodejs.org/download/) if you don't already have
   it.  You'll need NodeJS and npm.
1. Run `make setup`.  It will install the necessary npm packages.
1. Run `make`.
1. Enable developer mode in `chrome://extensions/`.
1. Click on the *Load unpacked extension...* button and select the directory
   containing `manifest.json`.
1. As of 2014-12-20, there is a built-in Fcommand that loads jQuery into the
   current page.  Enter `f loadjq` into Chrome's omnibox and (if you're not
   on a `chrome://` or `about://` page), jQuery will be loaded and you
   should get a notification after a few seconds that says which jQuery
   version it is.

## Modifying stuff

* After making changes, re-run `make` and then reload the extensions page.
  Depending on your changes, you may need to reload pages that now have an
  old version of the content and injected scripts.

* Take a look at `example/load-jquery.html` to see what goes into writing an
  Fcommand.

* Take a look at `TODO` to see what my thinking is on things that are Work
  In Progress.

* Expect nothing to work much of the time and that it will be difficult to
  the point of impossibility to use.  It's holding at version 0.0.1 for
  a reason.
