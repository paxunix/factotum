MAKEFLAGS := -j
SHELL := /bin/zsh
.SHELLFLAGS := -f -c
OUTDIR := build

_DEBUG := $(if $(NODEBUG),,-d)

TOOL := browserify

BG_SCRIPTS := $(shell cat deps-background.files)
CONTENT_SCRIPTS := $(shell cat deps-content.files)
INJECT_SCRIPTS := $(shell cat deps-inject.files)
TEST_SCRIPTS := $(shell cat deps-test.files)


all: build

build: build/background.js build/content.js build/inject.js build/test.js build/help.html

build/background.js: $(BG_SCRIPTS)
	mkdir -p $(OUTDIR)
	$(TOOL) $(_DEBUG) -t debowerify $(lastword $^) -o $@ $(DISOWN)

build/content.js: $(CONTENT_SCRIPTS)
	mkdir -p $(OUTDIR)
	$(TOOL) $(_DEBUG) -t debowerify $(lastword $^) -o $@ $(DISOWN)

build/inject.js: $(INJECT_SCRIPTS)
	mkdir -p $(OUTDIR)
	$(TOOL) $(_DEBUG) -t debowerify $^ -o $@ $(DISOWN)

build/test.js: $(TEST_SCRIPTS)
	mkdir -p $(OUTDIR)
	$(TOOL) $(_DEBUG) -t debowerify $^ -o $@ $(DISOWN)

build/help.html: html/help.html
	mkdir -p $(OUTDIR)
	./node_modules/vulcanize/bin/vulcanize $^ | \
        ./node_modules/crisper/bin/crisper --html $@ --js $(basename $@).js

DEPFILES := deps-background.files deps-content.files deps-inject.files deps-test.files
.PHONY: deps $(DEPFILES)
deps: $(DEPFILES)

deps-background.files: scripts/background.js
	$(TOOL) $(_DEBUG) -t debowerify $^ --list | sed -e 's,'$(PWD)'/,,' -e '/^\//d' > $@

deps-content.files: scripts/content.js
	$(TOOL) $(_DEBUG) -t debowerify $^ --list | sed -e 's,'$(PWD)'/,,' -e '/^\//d' > $@

deps-inject.files: scripts/inject.js
	$(TOOL) $(_DEBUG) -t debowerify $^ --list | sed -e 's,'$(PWD)'/,,' -e '/^\//d' > $@

deps-test.files: $(wildcard test/spec/*.js)
	$(TOOL) $(_DEBUG) -t debowerify $^ --list | sed -e 's,'$(PWD)'/,,' -e '/^\//d' > $@


kill:
	pkill -f `which watchify`; true

.PHONY: watchify
watchify: override TOOL := watchify -v
watchify: override DISOWN := &!
watchify: kill build

clean: kill
	rm -fr $(OUTDIR) $(DEPFILES)

update:
	bower update

setup:
	npm install debowerify watchify vulcanize crisper
	bower update
