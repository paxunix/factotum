MAKEFLAGS := -j
SHELL := /bin/zsh
OUTDIR := build

_DEBUG := $(if $(DEBUG),-d,)

TOOL := browserify


all: build

build::
	mkdir -p $(OUTDIR)
	-$(TOOL) $(_DEBUG) -t debowerify scripts/background.js -o $(OUTDIR)/background.js $(DISOWN)
	-$(TOOL) $(_DEBUG) --no-builtins -t debowerify scripts/content.js -o $(OUTDIR)/content.js $(DISOWN)
	-$(TOOL) $(_DEBUG) -t debowerify test/spec/*.js -o $(OUTDIR)/test.js $(DISOWN)

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
