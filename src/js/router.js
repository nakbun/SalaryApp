// Simple Router for Vanilla JS with Async Support
class Router {
    constructor() {
        this.routes = {};
        this.currentRoute = null;
        this.basePath = '/SalaryApp';
        this.init();
    }
    
    init() {
        window.addEventListener('popstate', () => this.handleRoute());
        window.addEventListener('load', () => this.handleRoute());
    }
    
    route(path, handler, requiresAuth = false) {
        this.routes[path] = { handler, requiresAuth };
    }
    
    navigate(path, replace = false) {
        const fullPath = this.basePath + path;
        if (replace) {
            window.history.replaceState({}, '', fullPath);
        } else {
            window.history.pushState({}, '', fullPath);
        }
        this.handleRoute();
    }
    
    async handleRoute() {
        const path = window.location.pathname.replace(this.basePath, '') || '/';
        const route = this.routes[path] || this.routes['*'];
        
        if (!route) {
            this.navigate('/', true);
            return;
        }
        
        if (route.requiresAuth && !Auth.isAuthenticated()) {
            this.navigate('/', true);
            return;
        }
        
        this.currentRoute = path;
        
        // Support async handlers
        try {
            await route.handler();
        } catch (error) {
            console.error('Route handler error:', error);
        }
    }
    
    getCurrentPath() {
        return window.location.pathname.replace(this.basePath, '') || '/';
    }
}

const router = new Router();
window.router = router;