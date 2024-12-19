MAKEFLAGS := -j1		# polymer build can't run separate entrypoints in parallel
SHELL := /bin/zsh
.SHELLFLAGS := -f -c
OUTDIR := release
SCRIPTS_DIR := $(OUTDIR)/scripts
HTML_DIR := $(OUTDIR)/html
POLYMER_BUILD := polymer-build

# If no changes in working dir, consider it a release build and use the
# hour+minute as the version suffix.  If changes, consider it a dev build in
# progress and use 9999 as the version suffix.
VERSION := $(shell set -x;if git status --porcelain | perl -nle '$$r = $$r || m{^m}i || m{^.m}i;' -e 'END { exit $$r }'; then git --no-pager log -1 --date=format:"%Y.%m.%d.%H%M" --format="%ad"; else git --no-pager log -1 --date=format:"%Y.%m.%d" --format="%ad.9999"; fi)

.DEFAULT := all


all: \
    manifest.json \
    html-copy \
    script-copy \
    relative-copy
	# $@
	rsync -av ./manifest.json $(OUTDIR)/
	sed -r -i -e 's/\{\{VERSION\}\}/$(VERSION)/' $(OUTDIR)/manifest.json
	touch $@


script-copy: html-copy \
        $(addprefix $(OUTDIR)/, \
            $(wildcard scripts/*.js) \
        )
	# $@
	touch $@


html-copy: \
        $(addprefix $(OUTDIR)/, \
            $(wildcard html/*.html) \
        )
	# $@
	touch $@


relative-copy: \
        example/* \
        icons \
        _locales/*/* \
        node_modules/dexie/dist/dexie.mjs \
        node_modules/webextension-polyfill/dist/browser-polyfill.js \
        node_modules/ace-builds/src-min-noconflict \
        node_modules/@webcomponents/html-imports/html-imports.min.js \
        | html-copy $(OUTDIR)/.
	# $@
	rsync -Rav $^ $(OUTDIR)/
	touch $@


tar: factotum.tar
factotum.tar: all
	# $@
	tar -hcvf factotum.tar $(OUTDIR)/
	touch $@


.PHONY: clean
clean:
	# $@
	rm -fr $(OUTDIR) $(POLYMER_BUILD) all script-copy html-copy relative-copy tar factotum.tar


.PHONY: update
update:
	# $@
	npm update


.PHONY: setup
setup:
	# $@
	npm install --include=dev


.PHONY: testserver
testserver: all
	# $@
	npx jasmine-browser-runner serve


.PHONY: test
test: all
	# $@
	npx jasmine-browser-runner runSpecs


.PRECIOUS: %/.
%/.:
	# $@
	mkdir -p $@


$(SCRIPTS_DIR)/%.js: scripts/%.js | $(SCRIPTS_DIR)/.
	# $@
	rsync -av $< $(dir $@)


# Because polymer build doesn't let you specify the build output directory
# (it hardcodes it to build/) AND it also cleans everything out of that
# directory before building, we force the output to be in a separate subdir
# (via some relative-path trickery to write the results outside the build
# tree from polymer build's perspective) and then rsync those built
# artifacts into the actual build directory once all polymer builds are
# done.
$(HTML_DIR)/%.html: html/%.html scripts/factotum-%-polymer.js | $(OUTDIR)/.
	# $@
	rm -fr $(POLYMER_BUILD)
	node_modules/.bin/polymer build --entrypoint $< --name ../$(POLYMER_BUILD)/.
	rsync -av $(POLYMER_BUILD)/* $(OUTDIR)/.
