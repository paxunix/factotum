# Commake-inspired project commands.
# See https://niallbunting.com/commake/

.PHONY: all help init install update build run lint test e2e plan deploy int versioncheck release tarball clean
.ONESHELL:
DEPS_STAMP := node_modules/.installed

all: lint test build #help Run local checks and build the development extension

help:
	@echo "-- HELP --"
	@grep '#[h]elp' $(MAKEFILE_LIST)

versioncheck: #help Check required local tool versions
	@node --version
	npm --version
	tar --version >/dev/null

init: versioncheck #help Run through dependencies and check
	@echo "Run 'make' to install dependencies, run checks, and build."

install: $(DEPS_STAMP) #help Install locked dependencies if missing or stale

$(DEPS_STAMP): package.json package-lock.json
	@npm ci && touch "$@"

update: #help Upgrade dependencies within their declared ranges
	@npm update && touch "$(DEPS_STAMP)"

build: $(DEPS_STAMP) #help Build the development unpacked extension in dist/
	@npm run build

release: $(DEPS_STAMP) #help Build the release unpacked extension in release/
	@npm run build:release

tarball: $(DEPS_STAMP) #help Build the release tarball in release/
	@npm run build:tarball

run: build #help Build locally and print Chrome loading instructions
	@echo "Load the unpacked extension from dist/ in chrome://extensions."
	echo "Enable Developer mode and 'Allow User Scripts' after loading."

lint: #help Run lightweight repository lint checks
	@git --no-pager diff --check

test: $(DEPS_STAMP) #help Run the unit tests
	@npm test

int: #help Run integration tests
	@echo "Not implemented"

e2e: #help Run end-to-end tests
	@echo "Not implemented"

plan: #help Plan infrastructure changes
	@echo "Not implemented"

deploy: #help Deploy infrastructure changes
	@echo "Not implemented"

clean: #help Remove generated build outputs
	@rm -rf dist release
