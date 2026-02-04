.PHONY: dev frontend backend clean build build-unsigned install setup lint lint-branch lint-fix lint-branch-fix stop-recording

# Start both frontend and backend in development mode
dev:
	@echo "🚀 Starting Whispering development environment..."
	@echo "📱 Frontend will be available at: http://localhost:1420"
	@echo "🔧 Backend will run as native macOS app"
	@echo ""
	@echo "🔍 Checking for existing Vite server..."
	@if lsof -ti:1420 >/dev/null 2>&1; then \
		echo "⚠️  Port 1420 is in use. Killing existing process..."; \
		kill $$(lsof -ti:1420) 2>/dev/null || true; \
		sleep 1; \
		echo "✅ Existing process terminated"; \
	else \
		echo "✅ Port 1420 is available"; \
	fi
	@echo ""
	@echo "Starting frontend..."
	@bun run dev:web &
	@echo "Frontend started in background"
	@echo ""
	@echo "Starting backend..."
	@cd src-tauri && cargo run
	@echo "Backend started"

# Start only the frontend development server
frontend:
	@echo "🌐 Starting frontend development server..."
	@bun run dev:web

# Start only the backend (Rust/Tauri)
backend:
	@echo "🔧 Starting backend..."
	@cd src-tauri && cargo run

# Gracefully stop an in-progress FFmpeg recording by file path (SIGINT so the file is finalized and playable).
# Use when the app window closed but the backend is still recording.
# Example: make stop-recording RECORDING_PATH="/Users/dave/Library/Application Support/com.bradenwong.whispering/recordings/nYKL8ouYnLu5s0VXQzH9L.m4a"
stop-recording:
	@if [ -z "$(RECORDING_PATH)" ]; then \
		echo "Usage: make stop-recording RECORDING_PATH=\"/path/to/recording.m4a\""; \
		echo "Example: make stop-recording RECORDING_PATH=\"$$HOME/Library/Application Support/com.bradenwong.whispering/recordings/YourRecordingId.m4a\""; \
		exit 1; \
	fi
	@echo "Looking for process writing to $(RECORDING_PATH)..."; \
	PIDS=$$(lsof -t "$(RECORDING_PATH)" 2>/dev/null); \
	if [ -z "$$PIDS" ]; then \
		echo "No process found with that file open. (Recording may already be stopped.)"; \
		exit 0; \
	fi; \
	for PID in $$PIDS; do \
		echo "Sending SIGINT to PID $$PID (graceful stop so file is playable)..."; \
		kill -INT $$PID 2>/dev/null || kill -2 $$PID 2>/dev/null || true; \
	done; \
	echo "Done. Wait a few seconds, then the file should be playable (e.g. in QuickTime)."

# Build production desktop app (signed)
build:
	@echo "🏗️  Building production desktop app..."
	@echo "📦 This will create a signed macOS app bundle"
	@echo "⚠️  Note: Code signing requires valid certificates"
	@echo ""
	@bun run tauri build
	@echo "✅ Production build complete!"
	@echo "📁 App bundle location: src-tauri/target/release/bundle/"

# Build production desktop app (unsigned - for testing)
build-unsigned:
	@echo "🏗️  Building production desktop app (unsigned)..."
	@echo "📦 This will create an unsigned macOS app bundle"
	@echo "⚠️  Note: You may need to allow unsigned apps in System Preferences"
	@echo ""
	@bun run tauri build
	@echo "✅ Unsigned production build complete!"
	@echo "📁 App bundle location: src-tauri/target/release/bundle/"
	@echo "🚀 To run the unsigned app:"
	@echo "   open src-tauri/target/release/bundle/macos/Whispering.app"

# Clean build artifacts
clean:
	@echo "🧹 Cleaning build artifacts..."
	@rm -rf node_modules
	@rm -rf .svelte-kit
	@rm -rf build
	@cd src-tauri && cargo clean
	@echo "✅ Clean complete"

# Install dependencies
install:
	@echo "📦 Installing dependencies..."
	@bun install
	@echo "✅ Dependencies installed"

# Full setup (install + dev)
setup: install dev

# Code quality checks (matches CI - checks entire repo)
lint:
	@echo "🔍 Running code quality checks (matches CI)..."
	@cd ../.. && \
	  bun run format:check && \
	  bun run lint:check && \
	  bun run check

# Check only files changed in current branch vs upstream/main (most common)
lint-branch:
	@cd ../.. && \
	  BASE_REF="$$(git remote get-url upstream 2>/dev/null | grep -q . && echo upstream/main || echo origin/main)" && \
	  ALL_FILES="$$(git diff --name-status $$BASE_REF...HEAD 2>/dev/null || true)" && \
	  TOTAL_COUNT=$$(if [ -n "$$ALL_FILES" ]; then echo "$$ALL_FILES" | grep -c . || echo 0; else echo 0; fi) && \
	  DELETED_FILES="$$(echo "$$ALL_FILES" | grep '^D' | cut -f2 || true)" && \
	  DELETED_COUNT=$$(if [ -n "$$DELETED_FILES" ]; then echo "$$DELETED_FILES" | grep -c . || echo 0; else echo 0; fi) && \
	  FILES="$$(git diff --name-only --diff-filter=ACM $$BASE_REF...HEAD 2>/dev/null | grep -E '\.(ts|tsx|js|jsx|svelte|astro|html|json|jsonc)$$' || true)" && \
	  FILE_COUNT=$$(if [ -n "$$FILES" ]; then echo "$$FILES" | grep -c . || echo 0; else echo 0; fi) && \
	  NON_DELETED_COUNT=$$((TOTAL_COUNT - DELETED_COUNT)) && \
	  NON_LINTABLE_COUNT=$$((NON_DELETED_COUNT - FILE_COUNT)) && \
	  if [ "$$TOTAL_COUNT" -eq 0 ]; then \
	    echo "✅ No changed files (compared to $$BASE_REF)"; \
	  else \
	    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"; \
	    echo "🔍 LIMITING CHECKS TO FILES CHANGED IN THIS BRANCH"; \
	    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"; \
	    echo ""; \
	    echo "📊 Diff from $$BASE_REF...HEAD: $$TOTAL_COUNT file(s) total"; \
	    if [ "$$DELETED_COUNT" -gt 0 ]; then \
	      echo "   └─ $$DELETED_COUNT file(s) deleted (skipped)"; \
	    fi; \
	    if [ "$$NON_LINTABLE_COUNT" -gt 0 ]; then \
	      echo "   └─ $$NON_LINTABLE_COUNT file(s) not lintable (wrong file type, skipped)"; \
	    fi; \
	    if [ -z "$$FILES" ] || [ "$$FILE_COUNT" -eq 0 ]; then \
	      echo "   └─ 0 file(s) to check"; \
	      echo ""; \
	      echo "✅ No files to check"; \
	    else \
	      echo "   └─ Checking lint on $$FILE_COUNT file(s) remaining:"; \
	      echo "$$FILES" | sed 's/^/      • /'; \
	      echo ""; \
	      echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"; \
	      echo ""; \
	      echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"; \
	      echo "📝 PHASE 1: FORMAT CHECKING"; \
	      echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"; \
	      echo ""; \
	      echo "  • Biome: Checks .ts, .tsx, .js, .jsx files (excludes .svelte, .astro, .html)"; \
	      TS_FILES="$$(echo "$$FILES" | grep -E '\.(ts|tsx|js|jsx)$$' || true)"; \
	      if [ -n "$$TS_FILES" ]; then \
	        echo "$$TS_FILES" | xargs bunx biome ci --linter-enabled=false || true; \
	      fi; \
	      echo ""; \
	      echo "  • Prettier: Checks .svelte, .astro, .html files (excludes .ts, .tsx, .js, .jsx)"; \
	      SVELTE_FILES="$$(echo "$$FILES" | grep -E '\.(svelte|astro|html)$$' || true)"; \
	      if [ -n "$$SVELTE_FILES" ]; then \
	        echo "$$SVELTE_FILES" | xargs bunx prettier --check || true; \
	      fi; \
	      echo ""; \
	      echo "✅ Format check complete"; \
	      echo ""; \
	      echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"; \
	      echo "🔍 PHASE 2: LINT CHECKING"; \
	      echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"; \
	      echo ""; \
	      echo "  • ESLint: Checks .svelte files only (will ignore .ts, .tsx, .js, .jsx files)"; \
	      echo "  • Biome: Checks .ts, .tsx, .js, .jsx files (excludes .svelte files)"; \
	      echo ""; \
	      LINT_FILES="$$(echo "$$FILES" | grep -E '\.(ts|tsx|js|jsx|svelte)$$' || true)"; \
	      if [ -n "$$LINT_FILES" ]; then \
	        echo "$$LINT_FILES" | xargs bunx eslint || true; \
	        echo "$$LINT_FILES" | xargs bunx biome lint || true; \
	      fi; \
	      echo ""; \
	      echo "✅ Lint check complete"; \
	      echo ""; \
	      echo "ℹ️  Note: Type checking requires full project analysis and is not file-specific."; \
	      echo "   Run 'make lint' to check types across the entire repository."; \
	    fi; \
	  fi

# Fix only files changed in current branch vs upstream/main
lint-fix lint-branch-fix:
	@cd ../.. && \
	  BASE_REF="$$(git remote get-url upstream 2>/dev/null | grep -q . && echo upstream/main || echo origin/main)" && \
	  ALL_FILES="$$(git diff --name-status $$BASE_REF...HEAD 2>/dev/null || true)" && \
	  TOTAL_COUNT=$$(if [ -n "$$ALL_FILES" ]; then echo "$$ALL_FILES" | grep -c . || echo 0; else echo 0; fi) && \
	  DELETED_FILES="$$(echo "$$ALL_FILES" | grep '^D' | cut -f2 || true)" && \
	  DELETED_COUNT=$$(if [ -n "$$DELETED_FILES" ]; then echo "$$DELETED_FILES" | grep -c . || echo 0; else echo 0; fi) && \
	  FILES="$$(git diff --name-only --diff-filter=ACM $$BASE_REF...HEAD 2>/dev/null | grep -E '\.(ts|tsx|js|jsx|svelte|astro|html|json|jsonc)$$' || true)" && \
	  FILE_COUNT=$$(if [ -n "$$FILES" ]; then echo "$$FILES" | grep -c . || echo 0; else echo 0; fi) && \
	  NON_DELETED_COUNT=$$((TOTAL_COUNT - DELETED_COUNT)) && \
	  NON_LINTABLE_COUNT=$$((NON_DELETED_COUNT - FILE_COUNT)) && \
	  if [ "$$TOTAL_COUNT" -eq 0 ]; then \
	    echo "✅ No changed files (compared to $$BASE_REF)"; \
	  else \
	    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"; \
	    echo "🔧 LIMITING FIXES TO FILES CHANGED IN THIS BRANCH"; \
	    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"; \
	    echo ""; \
	    echo "📊 Diff from $$BASE_REF...HEAD: $$TOTAL_COUNT file(s) total"; \
	    if [ "$$DELETED_COUNT" -gt 0 ]; then \
	      echo "   └─ $$DELETED_COUNT file(s) deleted (skipped)"; \
	    fi; \
	    if [ "$$NON_LINTABLE_COUNT" -gt 0 ]; then \
	      echo "   └─ $$NON_LINTABLE_COUNT file(s) not lintable (wrong file type, skipped)"; \
	    fi; \
	    if [ -z "$$FILES" ] || [ "$$FILE_COUNT" -eq 0 ]; then \
	      echo "   └─ 0 file(s) to fix"; \
	      echo ""; \
	      echo "✅ No files to fix"; \
	    else \
	      echo "   └─ Fixing lint on $$FILE_COUNT file(s) remaining:"; \
	      echo "$$FILES" | sed 's/^/      • /'; \
	      echo ""; \
	      echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"; \
	      echo ""; \
	      echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"; \
	      echo "📝 PHASE 1: FORMAT FIXING"; \
	      echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"; \
	      echo ""; \
	      echo "  • Biome: Fixes .ts, .tsx, .js, .jsx files (excludes .svelte, .astro, .html)"; \
	      TS_FILES="$$(echo "$$FILES" | grep -E '\.(ts|tsx|js|jsx)$$' || true)"; \
	      if [ -n "$$TS_FILES" ]; then \
	        echo "$$TS_FILES" | xargs bunx biome check --write --linter-enabled=false || true; \
	      fi; \
	      echo ""; \
	      echo "  • Prettier: Fixes .svelte, .astro, .html files (excludes .ts, .tsx, .js, .jsx)"; \
	      SVELTE_FILES="$$(echo "$$FILES" | grep -E '\.(svelte|astro|html)$$' || true)"; \
	      if [ -n "$$SVELTE_FILES" ]; then \
	        echo "$$SVELTE_FILES" | xargs bunx prettier --write || true; \
	      fi; \
	      echo ""; \
	      echo "✅ Format fixes complete"; \
	      echo ""; \
	      echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"; \
	      echo "🔧 PHASE 2: LINT FIXING"; \
	      echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"; \
	      echo ""; \
	      echo "  • ESLint: Fixes .svelte files only (will ignore .ts, .tsx, .js, .jsx files)"; \
	      echo "  • Biome: Fixes .ts, .tsx, .js, .jsx files (excludes .svelte files)"; \
	      echo ""; \
	      LINT_FILES="$$(echo "$$FILES" | grep -E '\.(ts|tsx|js|jsx|svelte)$$' || true)"; \
	      if [ -n "$$LINT_FILES" ]; then \
	        echo "$$LINT_FILES" | xargs bunx eslint --fix || true; \
	        echo "$$LINT_FILES" | xargs bunx biome lint --write || true; \
	      fi; \
	      echo ""; \
	      echo "✅ Lint fixes complete"; \
	    fi; \
	  fi

