---
trigger: always_on
---

# Docker Build & Deployment Rules

## Core Principles

1. **Cross-Architecture Compatibility**
   - All Docker images must be built using `docker buildx` for multi-platform support (ARM, x86_64)
   - All image builds must include the `--platform` flag specifying target architectures

2. **Build Process Consistency**
   - Local development Docker build process must exactly match GitHub Actions workflow
   - Use identical build arguments, tags, and commands across all environments
   - Document all build commands in both `.github/workflows` and project documentation

3. **Docker Compose Deployment**
   - Docker Compose is the ONLY method for deploying the application
   - The `docker-compose.yml` file must be fully self-contained with no external includes
   - No build instructions in docker-compose.yml; images must be pre-built
   - No external volumes; only use internal Docker-managed volumes

4. **Separation of Concerns**
   - Never use Docker Compose to build images
   - Docker Compose commands limited to: `up`, `down`, and `logs`
   - Images must be built separately via dedicated build commands

5. **One-Step Deployment**
   - Anyone must be able to deploy the full PKC stack using only the provided `docker-compose.yml` file
   - No additional scripts or dependencies should be required for deployment
   - Pre-built images should be available in a public registry

## Standard Commands

### Build Commands (Local Development)

```bash
# Build for multiple platforms (match GitHub Actions)
docker buildx create --name multiarch --driver docker-container --use
docker buildx build --platform linux/amd64,linux/arm64 -t henry768/pkc:latest -f Dockerfile .
```

### GitHub Actions Build

```yaml
# From GitHub workflow file
- name: Set up QEMU
  uses: docker/setup-qemu-action@v3

- name: Set up Docker Buildx
  uses: docker/setup-buildx-action@v3

- name: Build and push
  uses: docker/build-push-action@v4
  with:
    context: .
    push: true
    platforms: linux/amd64,linux/arm64
    tags: henry768/pkc:latest
    cache-from: type=registry,ref=henry768/pkc:buildcache
    cache-to: type=registry,ref=henry768/pkc:buildcache,mode=max
```

### Deployment Commands

```bash
# Deploy the stack
docker compose up -d

# View logs
docker compose logs -f

# Shut down the stack
docker compose down
```

## Docker Compose Template

```yaml
version: '3.8'

services:
  pkc-app:
    image: henry768/pkc:latest  # Pre-built image, never use build directive
    restart: unless-stopped
    ports:
      - "80:80"
    environment:
      - NODE_ENV=production
    # No external volumes, only Docker-managed volumes
    volumes:
      - pkc_data:/usr/share/nginx/html/data

volumes:
  pkc_data:  # Docker-managed volume, not external
```

## Important Rules

1. Never include build instructions in docker-compose.yml
2. Always use pre-built images in docker-compose.yml
3. Keep docker-compose.yml fully self-contained
4. Match local build procedures with GitHub Actions workflows
5. Build for multiple architectures to ensure cross-platform compatibility
6. Document all environment variables needed for runtime
7. Use the same image tags consistently across all environments
8. Test deployment locally before pushing to production
9. Validate the docker-compose.yml file with `docker compose config`
10. Keep all container configurations in the docker-compose.yml file
11. Never use external volumes in docker-compose.yml
