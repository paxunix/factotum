MAKEFLAGS := -j
SHELL := /bin/zsh
.SHELLFLAGS := -f -c
OUTDIR := build

_DEBUG := $(if $(NODEBUG),,-d)

TOOL := browserify

# If adding/removing a bg file, update this list:
#	browserify -t debowerify scripts/background.js --list | sed -e 's,'$PWD'/,,' -e '/^\//d'
# We don't do it on each makefile invocation because it's time-consuming.
BG_SCRIPTS := \
    scripts/Util.js \
    scripts/ShellParse.js \
    scripts/GetOpt.js \
    scripts/Help.js \
    scripts/TransferObject.js \
    scripts/FactotumBg.js \
    bower_components/dexie/dist/latest/Dexie.js \
    scripts/FcommandManager.js \
    bower_components/node-semver/semver.js \
    scripts/Fcommand.js \
    scripts/background.js \

# If adding/removing a content file, update this list:
#	browserify -t debowerify scripts/content.js --list | sed -e 's,'$PWD'/,,' -e '/^\//d'
# We don't do it on each makefile invocation because it's time-consuming.
CONTENT_SCRIPTS := \
    scripts/TransferObject.js \
    scripts/Util.js \
    scripts/ContentScript.js \
    scripts/content.js \

# If adding/removing a content file, update this list:
#	browserify -t debowerify scripts/inject.js --list | sed -e 's,'$PWD'/,,' -e '/^\//d'
# We don't do it on each makefile invocation because it's time-consuming.
INJECT_SCRIPTS := \
	scripts/TransferObject.js \
	scripts/inject.js \

# If adding/removing a test file, update this list:
#	browserify -t debowerify test/spec/*.js --list | sed -e 's,'$PWD'/,,' -e '/^\//d'
# We don't do it on each makefile invocation because it's time-consuming.
TEST_SCRIPTS := \
	test/spec/spec-Fcommand.js \
	test/spec/spec-TransferObject.js \
	test/spec/spec-Util.js \
	scripts/TransferObject.js \
	scripts/GetOpt.js \
	test/spec/spec-GetOpt.js \
	scripts/Util.js \
	test/spec/spec-inject.js \
	scripts/ShellParse.js \
	test/spec/spec-ShellParse.js \
	scripts/ContentScript.js \
	test/spec/spec-ContentScript.js \
	scripts/Help.js \
	scripts/FactotumBg.js \
	bower_components/dexie/dist/latest/Dexie.js \
	scripts/FcommandManager.js \
	test/spec/spec-FcommandManager.js \
	bower_components/node-semver/semver.js \
	scripts/Fcommand.js \
	test/spec/spec-FactotumBg.js \


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

kill:
	pkill -f `which watchify`; true

.PHONY: watchify
watchify: override TOOL := watchify -v
watchify: override DISOWN := &!
watchify: kill build

clean: kill
	rm -fr $(OUTDIR)

update:
	bower update

setup:
	npm install debowerify watchify vulcanize crisper
	bower update
