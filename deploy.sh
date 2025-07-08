#!/bin/bash

# V3 Data Query System Deployment Script
# Optimized for production deployment

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_NAME="v3-data-query-system"
DOCKER_COMPOSE_FILE="docker-compose.prod.yml"
BACKUP_DIR="./backups"
LOG_FILE="./deploy.log"

# Functions
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

success() {
    echo -e "${GREEN}✓${NC} $1" | tee -a "$LOG_FILE"
}

warning() {
    echo -e "${YELLOW}⚠${NC} $1" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}✗${NC} $1" | tee -a "$LOG_FILE"
}

# Check prerequisites
check_prerequisites() {
    log "Checking prerequisites..."
    
    # Check Docker
    if ! command -v docker &> /dev/null; then
        error "Docker is not installed"
        exit 1
    fi
    
    # Check Docker Compose
    if ! command -v docker-compose &> /dev/null; then
        error "Docker Compose is not installed"
        exit 1
    fi
    
    # Check if Docker daemon is running
    if ! docker info &> /dev/null; then
        error "Docker daemon is not running"
        exit 1
    fi
    
    success "Prerequisites check passed"
}

# Create backup
create_backup() {
    log "Creating backup..."
    
    mkdir -p "$BACKUP_DIR"
    
    # Backup current deployment if exists
    if docker-compose -f "$DOCKER_COMPOSE_FILE" ps | grep -q "Up"; then
        BACKUP_NAME="backup_$(date +%Y%m%d_%H%M%S)"
        
        # Export current containers
        docker-compose -f "$DOCKER_COMPOSE_FILE" config > "$BACKUP_DIR/$BACKUP_NAME.yml"
        
        # Backup volumes
        docker run --rm -v v3-data-query-system_redis_data:/data -v "$PWD/$BACKUP_DIR":/backup alpine tar czf "/backup/$BACKUP_NAME-redis.tar.gz" -C /data .
        
        success "Backup created: $BACKUP_NAME"
    else
        warning "No running containers found, skipping backup"
    fi
}

# Build images
build_images() {
    log "Building Docker images..."
    
    # Build backend image
    log "Building backend image..."
    docker build -t v3-backend:latest -f Dockerfile .
    
    # Build frontend image
    log "Building frontend image..."
    docker build -t v3-frontend:latest -f Dockerfile.frontend .
    
    success "Images built successfully"
}

# Deploy application
deploy() {
    log "Deploying application..."
    
    # Stop existing containers
    log "Stopping existing containers..."
    docker-compose -f "$DOCKER_COMPOSE_FILE" down --remove-orphans
    
    # Start new containers
    log "Starting new containers..."
    docker-compose -f "$DOCKER_COMPOSE_FILE" up -d
    
    success "Application deployed"
}

# Health check
health_check() {
    log "Performing health check..."
    
    # Wait for services to start
    sleep 30
    
    # Check backend health
    if curl -f http://localhost:5000/health &> /dev/null; then
        success "Backend health check passed"
    else
        error "Backend health check failed"
        return 1
    fi
    
    # Check frontend health
    if curl -f http://localhost/frontend-health &> /dev/null; then
        success "Frontend health check passed"
    else
        error "Frontend health check failed"
        return 1
    fi
    
    success "All health checks passed"
}

# Cleanup old images
cleanup() {
    log "Cleaning up old images..."
    
    # Remove dangling images
    docker image prune -f
    
    # Remove old backups (keep last 5)
    if [ -d "$BACKUP_DIR" ]; then
        cd "$BACKUP_DIR"
        ls -t backup_*.yml 2>/dev/null | tail -n +6 | xargs -r rm
        ls -t backup_*.tar.gz 2>/dev/null | tail -n +6 | xargs -r rm
        cd ..
    fi
    
    success "Cleanup completed"
}

# Show status
show_status() {
    log "Deployment status:"
    docker-compose -f "$DOCKER_COMPOSE_FILE" ps
    
    echo ""
    log "Application URLs:"
    echo "  Frontend: http://localhost"
    echo "  Backend API: http://localhost/api"
    echo "  Health Check: http://localhost/health"
    
    echo ""
    log "Logs:"
    echo "  View logs: docker-compose -f $DOCKER_COMPOSE_FILE logs -f"
    echo "  Backend logs: docker-compose -f $DOCKER_COMPOSE_FILE logs -f backend"
    echo "  Frontend logs: docker-compose -f $DOCKER_COMPOSE_FILE logs -f frontend"
}

# Rollback function
rollback() {
    log "Rolling back to previous version..."
    
    # Find latest backup
    LATEST_BACKUP=$(ls -t "$BACKUP_DIR"/backup_*.yml 2>/dev/null | head -n 1)
    
    if [ -z "$LATEST_BACKUP" ]; then
        error "No backup found for rollback"
        exit 1
    fi
    
    log "Rolling back to: $LATEST_BACKUP"
    
    # Stop current containers
    docker-compose -f "$DOCKER_COMPOSE_FILE" down
    
    # Restore from backup
    cp "$LATEST_BACKUP" "$DOCKER_COMPOSE_FILE.rollback"
    docker-compose -f "$DOCKER_COMPOSE_FILE.rollback" up -d
    
    success "Rollback completed"
}

# Main deployment process
main() {
    log "Starting V3 Data Query System deployment..."
    
    case "${1:-deploy}" in
        "deploy")
            check_prerequisites
            create_backup
            build_images
            deploy
            health_check
            cleanup
            show_status
            success "Deployment completed successfully!"
            ;;
        "rollback")
            rollback
            ;;
        "status")
            show_status
            ;;
        "logs")
            docker-compose -f "$DOCKER_COMPOSE_FILE" logs -f
            ;;
        "stop")
            log "Stopping application..."
            docker-compose -f "$DOCKER_COMPOSE_FILE" down
            success "Application stopped"
            ;;
        "restart")
            log "Restarting application..."
            docker-compose -f "$DOCKER_COMPOSE_FILE" restart
            health_check
            success "Application restarted"
            ;;
        *)
            echo "Usage: $0 {deploy|rollback|status|logs|stop|restart}"
            echo ""
            echo "Commands:"
            echo "  deploy   - Deploy the application (default)"
            echo "  rollback - Rollback to previous version"
            echo "  status   - Show application status"
            echo "  logs     - Show application logs"
            echo "  stop     - Stop the application"
            echo "  restart  - Restart the application"
            exit 1
            ;;
    esac
}

# Run main function
main "$@"