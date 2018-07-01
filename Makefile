MAKEFLAGS := -j
SHELL := /bin/zsh
.SHELLFLAGS := -f -c
OUTDIR := build
TESTDIR := test-build
SCRIPTS_DIR := $(OUTDIR)/scripts
HTML_DIR := $(OUTDIR)/html
.DEFAULT := all


.PHONY: all
all: \
    script-copy \
    html-copy \
    relative-copy \


.PHONY: script-copy
script-copy: \
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
        | $(OUTDIR)/.
	rsync -Rav $^ $(OUTDIR)/


.PHONY: tar
tar: factotum.tar
factotum.tar: all
	tar -hcvf factotum.tar build/


.PHONY: clean
clean:
	rm -fr $(OUTDIR) $(TESTDIR)


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


$(HTML_DIR)/%.html: html/%.html | $(HTML_DIR)/.
	rsync -av $< $(dir $@)
