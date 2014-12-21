MAKEFLAGS := -j
SHELL := /bin/zsh
OUTDIR := build

_DEBUG := $(if $(DEBUG),-d,)

TOOL := watchify -v
#TOOL := browserify


all: watchify

watchify: kill
	mkdir -p $(OUTDIR)
	-$(TOOL) $(_DEBUG) -t debowerify scripts/background.js -o $(OUTDIR)/background.js &!
	-$(TOOL) $(_DEBUG) --no-builtins -t debowerify scripts/content.js -o $(OUTDIR)/content.js &!
	-$(TOOL) $(_DEBUG) -t debowerify test/spec/*.js -o $(OUTDIR)/test.js &!

kill:
	-pkill -f watchify

clean: kill
	rm -fr $(OUTDIR)

update:
	bower update

setup:
	npm install debowerify watchify
	bower update
