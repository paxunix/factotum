MAKEFLAGS := -j --output-sync
SHELL := /bin/zsh
.SHELLFLAGS := -f -c
OUTDIR := build

PACKAGE_NAME := factotum


build: html webpack

html: \
	$(OUTDIR)/help.html \
	$(OUTDIR)/popup.html

$(OUTDIR)/%.html: html/%.html | webpack
	mkdir -p $(dir $@)
	./node_modules/vulcanize/bin/vulcanize $^ | \
        ./node_modules/crisper/bin/crisper --html $@ --js $(basename $@).js

webpack:
	./node_modules/webpack/bin/webpack.js -d

watch:
	pkill -f '[w]ebpack' ; true
	./node_modules/webpack/bin/webpack.js -d -w &!

package: manifest.json build/ html icons _locales example
	mkdir -p $(PACKAGE_NAME)
	cp -prv $^ $(PACKAGE_NAME)/

clean:
	pkill -f '[w]ebpack' ; true
	rm -fr $(OUTDIR)

update:
	npm update
	./node_modules/bower/bin/bower update

setup:
	npm install
	./node_modules/bower/bin/bower install
