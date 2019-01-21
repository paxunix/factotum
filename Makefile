MAKEFLAGS := -j1		# polymer build can't run separate entrypoints in parallel
SHELL := /bin/zsh
.SHELLFLAGS := -f -c
OUTDIR := release
TESTDIR := test-build
SCRIPTS_DIR := $(OUTDIR)/scripts
HTML_DIR := $(OUTDIR)/html
POLYMER_BUILD := polymer-build
.DEFAULT := all


.PHONY: all
all: \
    html-copy \
    script-copy \
    relative-copy \


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
        node_modules/dexie/dist/dexie.es.js \
        node_modules/webextension-polyfill/dist/browser-polyfill.js \
        node_modules/ace-builds/src-min-noconflict \
        | html-copy $(OUTDIR)/.
	rsync -Rav $^ $(OUTDIR)/


.PHONY: tar
tar: factotum.tar
factotum.tar: all
	tar -hcvf factotum.tar $(OUTDIR)/


.PHONY: clean
clean:
	rm -fr $(OUTDIR) $(TESTDIR) $(POLYMER_BUILD)


.PHONY: update
update:
	npm update


.PHONY: setup
setup:
	npm install --dev


.PHONY: test-copy
test-copy: all | $(TESTDIR)/.
	cd $(TESTDIR) && ln -sf $(abspath $(OUTDIR))/* ./
	cd $(TESTDIR) && ln -sf $(abspath node_modules/jasmine-core) ./node_modules/
	rsync -av test/spec/* test/run-spec.html $(TESTDIR)/


.PHONY: testserver
testserver: test-copy
	cd $(TESTDIR) && python -m SimpleHTTPServer


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
