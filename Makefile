# Makefile

# Variables
DOCKER_NETWORK = nextcms_network
ENV_FILE = .env
ENV_EXAMPLE_FILE = .env.example

# Targets
.PHONY: all setup install env docker-network db-reset create-admin dev

all: setup dev

setup: install env docker-network db-reset create-admin
	@echo "Setup complete. Run 'make dev' to start the application."

install:
	@echo "Installing dependencies..."
	pnpm i

env:
	@if not exist $(ENV_FILE) ( \
		echo "Error: .env file not found. Please create a .env file based on .env.example." & \
		exit /b 1 \
	) else ( \
		echo "Using existing .env file." \
	)

# Create Docker network if not exists
# docker-network:
# 	@if docker network inspect $(DOCKER_NETWORK) >nul 2>&1; then ( \
# 		echo Docker network $(DOCKER_NETWORK) already exists. \
# 	) else ( \
# 		echo Creating Docker network $(DOCKER_NETWORK)... & \
# 		docker network create $(DOCKER_NETWORK) \
# 	)

# Run Docker Compose
docker-compose:
	@echo "Starting Docker containers..."
	docker-compose up -d

# Reset the database
db-reset:
	@echo "Resetting the database..."
	pnpm db:reset

# Create admin user
create-admin:
	@echo "Creating admin user..."
	pnpm create:admin

# Start development server
dev:
	@echo "Starting development server..."
	pnpm dev
