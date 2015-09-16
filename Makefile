MAKEFLAGS := -j --output-sync
OUTDIR := build

_DEBUG := $(if $(NODEBUG),,-d)

TOOL := node_modules/webpack/bin/webpack.js

PACKAGE_NAME := factotum


all: build

build: \
    $(OUTDIR)/background.js \
	$(OUTDIR)/content.js \
	$(OUTDIR)/inject.js \
	$(OUTDIR)/test.js \
	$(OUTDIR)/help.html

$(OUTDIR)/%.js: scripts/%.js
	mkdir -p $(dir $@)
	$(TOOL) $(_DEBUG) $^ $@

$(OUTDIR)/test.js: $(wildcard test/spec/*.js)
	mkdir -p $(dir $@)
	$(TOOL) $(_DEBUG) $^ $@

$(OUTDIR)/help.html: html/help.html
	mkdir -p $(dir $@)
	./node_modules/vulcanize/bin/vulcanize $^ | \
        ./node_modules/crisper/bin/crisper --html $@ --js $(basename $@).js


package: manifest.json build/ html icons _locales example
	mkdir -p $(PACKAGE_NAME)
	cp -prv $^ $(PACKAGE_NAME)/


clean:
	rm -fr $(OUTDIR)

update:
	npm update
	bower update

setup:
	npm install webpack bower vulcanize crisper
