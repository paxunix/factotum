MAKEFLAGS := -j
SHELL := /bin/zsh

NODE_MODULES := dexie minimist semver

_DEBUG := $(if $(DEBUG),-d,)
DIR := scripts
INPUT_FILES := $(shell fgrep -l ' = require' $(DIR)/*.js)
OUTPUT_FILES := $(addsuffix .bundle,$(INPUT_FILES))

scripts/%.js.bundle: scripts/%.js
	browserify $(_DEBUG) $< > $@

all: browserify

browserify: $(OUTPUT_FILES)

clean:
	rm -f $(OUTPUT_FILES)

node-setup:
	npm install $(NODE_MODULES)

node-update:
	npm update $(NODE_MODULES)
