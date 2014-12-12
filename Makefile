MAKEFLAGS := -j
SHELL := /bin/zsh

NODE_MODULES := dexie minimist semver

_DEBUG := $(if $(DEBUG),-d,)
DIR := scripts
INPUT_FILES := $(shell fgrep -l ' = require' $(DIR)/*.js)
OUTPUT_FILES := $(addsuffix .bundle,$(INPUT_FILES))

all: browserify

browserify: npm_install $(OUTPUT_FILES)

npm_install: $(addprefix node_modules/,$(NODE_MODULES))

clean:
	rm -f $(OUTPUT_FILES)

node-update:
	npm update $(NODE_MODULES)

# Pattern rules
scripts/%.js.bundle: scripts/%.js npm_install
	browserify $(_DEBUG) $< > $@

node_modules/%:
	npm install $(notdir $@)
