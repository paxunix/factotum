MAKEFLAGS := -j
SHELL := /bin/zsh
OUTDIR := build

_DEBUG := $(if $(DEBUG),-d,)

TOOL := browserify

# If adding/removing a bg file, update this list:
#	browserify -t debowerify scripts/background.js --list | sed -e 's,'$PWD'/,,' -e '/^\//d'
# We don't do it on each makefile invocation because it's time-consuming.
BG_SCRIPTS := scripts/ShellParse.js \
              scripts/GetOpt.js \
              scripts/Util.js \
              bower_components/node-semver/semver.js \
              scripts/Fcommand.js \
              scripts/FactotumBg.js \
              scripts/background.js

# If adding/removing a content file, update this list:
#	browserify -t debowerify scripts/content.js --list | sed -e 's,'$PWD'/,,' -e '/^\//d'
# We don't do it on each makefile invocation because it's time-consuming.
CONTENT_SCRIPTS := scripts/Util.js \
                   scripts/ContentScript.js \
                   scripts/content.js


all: build

build: build/background.js build/content.js build/test.js

build/background.js: $(BG_SCRIPTS)
	mkdir -p $(OUTDIR)
	$(TOOL) $(_DEBUG) -t debowerify $(lastword $^) -o $@ $(DISOWN)

build/content.js: $(CONTENT_SCRIPTS)
	mkdir -p $(OUTDIR)
	$(TOOL) $(_DEBUG) -t debowerify $(lastword $^) -o $@ $(DISOWN)

build/test.js: $(wildcard test/spec/*.js)
	mkdir -p $(OUTDIR)
	$(TOOL) $(_DEBUG) -t debowerify $^ -o $@ $(DISOWN)

kill:
	-pkill -f watchify

watchify: override TOOL := watchify -v
watchify: override DISOWN := &!
watchify: kill build

clean: kill
	rm -fr $(OUTDIR)

update:
	bower update

setup:
	npm install debowerify watchify
	bower update
