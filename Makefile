PACKAGE_NAME := factotum
MAKEFLAGS := -j --output-sync
SHELL := /bin/zsh
.SHELLFLAGS := -f -c
OUTDIR := build
XFORM_HTML_ROOTNAMES := $(patsubst html/factotum-%-polymer.html,%,$(wildcard html/factotum-*-polymer.html))

.PHONY: all
all: bundle xform-html flat-copy non-flat-copy
	ln -sf -t $(OUTDIR) ../bower_components

.PHONY: bundle
bundle: \
        $(OUTDIR)/background.bundle.js \
        $(OUTDIR)/content.bundle.js \
        $(OUTDIR)/inject.bundle.js

.PHONY: xform-html
xform-html: \
        $(addsuffix .html,$(addprefix $(OUTDIR)/,$(XFORM_HTML_ROOTNAMES)))
	mkdir -p $(OUTDIR)

.PHONY: non-flat-copy
non-flat-copy: \
        icons \
        manifest.json
	mkdir -p $(OUTDIR)
	rsync -av $^ $(OUTDIR)/

.PHONY: flat-copy
flat-copy: \
        _locales/*/* \
        example/*
	mkdir -p $(OUTDIR)
	rsync -Rav $^ $(OUTDIR)/

$(OUTDIR)/%.html: html/%.html html/factotum-%-polymer.html
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
