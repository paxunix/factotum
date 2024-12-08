MAKEFLAGS := -j1		# polymer build can't run separate entrypoints in parallel
SHELL := /bin/zsh
.SHELLFLAGS := -f -c
OUTDIR := release
SCRIPTS_DIR := $(OUTDIR)/scripts
HTML_DIR := $(OUTDIR)/html
POLYMER_BUILD := polymer-build

VERSION := $(shell git --no-pager log -1 --date=format:"%Y.%m.%d.%H%M" --format="%ad")

.DEFAULT := all


.PHONY: all
all: \
    html-copy \
    script-copy \
    relative-copy
	sed -r -i -e 's/\{\{VERSION\}\}/$(VERSION)/' $(OUTDIR)/manifest.json


.PHONY: script-copy
script-copy: html-copy \
        $(addprefix $(OUTDIR)/, \
            $(wildcard scripts/*.js) \
        )


.PHONY: html-copy
html-copy: \
        $(addprefix $(OUTDIR)/, \
            $(wildcard html/*.html) \
        )


.PHONY: relative-copy
relative-copy: \
        example/* \
        icons \
        _locales/*/* \
        manifest.json \
        node_modules/dexie/dist/dexie.mjs \
        node_modules/webextension-polyfill/dist/browser-polyfill.js \
        node_modules/ace-builds/src-min-noconflict \
        node_modules/@webcomponents/html-imports/html-imports.min.js \
        | html-copy $(OUTDIR)/.
	rsync -Rav $^ $(OUTDIR)/


.PHONY: tar
tar: factotum.tar
factotum.tar: all
	tar -hcvf factotum.tar $(OUTDIR)/


.PHONY: clean
clean:
	rm -fr $(OUTDIR) $(POLYMER_BUILD)


.PHONY: update
update:
	npm update


.PHONY: setup
setup:
	npm install --include=dev


.PHONY: testserver
testserver:
	npx jasmine-browser-runner serve


.PHONY: test
test:
	npx jasmine-browser-runner runSpecs


.PRECIOUS: %/.
%/.:
	mkdir -p $@


$(SCRIPTS_DIR)/%.js: scripts/%.js | $(SCRIPTS_DIR)/.
	rsync -av $< $(dir $@)


# Because polymer build doesn't let you specify the build output directory
# (it hardcodes it to build/) AND it also cleans everything out of that
# directory before building, we force the output to be in a separate subdir
# (via some relative-path trickery to write the results outside the build
# tree from polymer build's perspective) and then rsync those built
# artifacts into the actual build directory once all polymer builds are
# done.
$(HTML_DIR)/%.html: html/%.html scripts/factotum-%-polymer.js | $(OUTDIR)/.
	rm -fr $(POLYMER_BUILD)
	node_modules/.bin/polymer build --entrypoint $< --name ../$(POLYMER_BUILD)/.
	rsync -av $(POLYMER_BUILD)/* $(OUTDIR)/.
