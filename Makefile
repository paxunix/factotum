MAKEFLAGS := -j --output-sync
SHELL := /bin/zsh
.SHELLFLAGS := -f -c
OUTDIR := build

PACKAGE_NAME := factotum

.PHONY: all
all: bundle xform-html flat-copy non-flat-copy

.PHONY: bundle
bundle: \
        $(OUTDIR)/background.bundle.js \
        $(OUTDIR)/content.bundle.js \
        $(OUTDIR)/inject.bundle.js

.PHONY: xform-html
xform-html: \
        $(OUTDIR)/help.html \
        $(OUTDIR)/popup.html \
        $(OUTDIR)/errors.html \
        $(OUTDIR)/fcommands.html
	mkdir -p $(OUTDIR)

.PHONY: flat-copy
flat-copy: \
        manifest.json
	mkdir -p $(OUTDIR)
	rsync -av $^ $(OUTDIR)/

.PHONY: non-flat-copy
non-flat-copy: \
        icons/*.png \
        _locales/*/* \
        example/*
	mkdir -p $(OUTDIR)
	rsync -Rav $^ $(OUTDIR)/

$(OUTDIR)/pagespopup.html: html/factotum-popup-polymer.html

$(OUTDIR)/errors.html: html/factotum-error-polymer.html

$(OUTDIR)/fcommands.html: html/factotum-fcommands-polymer.html

$(OUTDIR)/%.html: html/%.html
	mkdir -p $(dir $@)
	setopt pipefail; ./node_modules/vulcanize/bin/vulcanize $< | \
        ./node_modules/crisper/bin/crisper --html $@.tmp --js $(basename $@).js
	mv $@.tmp $@

$(OUTDIR)/%.bundle.js: scripts/%.js
	mkdir -p $(dir $@)
	./node_modules/webpack/bin/webpack.js -d $< $@

.PHONY: package
package: manifest.json $(OUTDIR)/*.html $(OUTDIR)/*.js
	mkdir -p $(PACKAGE_NAME)
	cp -prv $^ $(PACKAGE_NAME)/

.PHONY: clean
clean:
	rm -fr $(OUTDIR)

.PHONY: update
update:
	npm update
	./node_modules/bower/bin/bower update

.PHONY: setup
setup:
	npm install
	./node_modules/bower/bin/bower install

.PHONY: testserver
testserver:
	-python -m SimpleHTTPServer
