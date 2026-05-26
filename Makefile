.PHONY: run build test run-release clean open dev

run:
	swift run BroverApp

build:
	swift build

test:
	swift test

run-release:
	swift run -c release BroverApp

clean:
	swift package clean

open:
	APP_PATH=$$(swift build --show-bin-path)/BroverApp.app; \
	if [ -d "$$APP_PATH" ]; then \
		open "$$APP_PATH"; \
	else \
		echo "BroverApp.app not found at $$APP_PATH"; \
		echo "Use 'make run' or package app bundle first."; \
		exit 1; \
	fi

dev:
	@if ! command -v watchexec >/dev/null 2>&1; then \
		echo "watchexec missing. Install: brew install watchexec"; \
		exit 1; \
	fi
	watchexec -e swift --restart -- "swift run BroverApp"
