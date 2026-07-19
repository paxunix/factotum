# Commake-inspired project commands.
# See https://niallbunting.com/commake/

.PHONY: all help init install build run lint test e2e plan deploy int versioncheck release tarball clean
.ONESHELL:

all: lint test build #help Run local checks and build the development extension

help:
	@echo "-- HELP --"
	@grep '#[h]elp' $(MAKEFILE_LIST)

versioncheck: #help Check required local tool versions
	@node --version
	npm --version
	tar --version >/dev/null

init: versioncheck #help Run through dependencies and check
	@echo "Dependencies look available. Run 'make install' if node_modules is missing or stale."

install: versioncheck #help Install project packages
	@npm install

build: #help Build the development unpacked extension in dist/
	@npm run build

release: #help Build the release unpacked extension in release/
	@npm run build:release

tarball: #help Build the release tarball in release/
	@npm run build:tarball

run: build #help Build locally and print Chrome loading instructions
	@echo "Load the unpacked extension from dist/ in chrome://extensions."
	echo "Enable Developer mode and 'Allow User Scripts' after loading."

lint: #help Run lightweight repository lint checks
	@git diff --check

test: #help Run the unit tests
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
