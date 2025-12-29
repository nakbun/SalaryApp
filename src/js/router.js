class Router {
    constructor() {
        this.routes = {};
        this.currentRoute = null;
        this.basePath = '/SalaryApp';
        this.isNavigating = false;
        this.isInitialized = false; // ← เพิ่มตัวแปรเช็คว่า init แล้วหรือยัง
        
        // ✅ ไม่เรียก init() ใน constructor แล้ว
        // จะเรียกผ่าน start() แทน
        
        // Setup popstate listener
        window.addEventListener('popstate', () => {
            this.isNavigating = false;
            this.handleRoute();
        });
    }

    /**
     * Start router - เรียกหลังจาก register routes เสร็จแล้ว
     */
    start() {
        if (this.isInitialized) {
            return;
        }
        
        this.isInitialized = true;
        this.handleInitialRoute();
    }

    handleInitialRoute() {
        const path = this.getCurrentPath();
        const isAuth = Auth.isAuthenticated();
        
        // ✅ ตรวจสอบว่า route มีอยู่จริง
        const route = this.routes[path];
        
        if (!route) {
            
            // ถ้า login แล้วแต่หา route ไม่เจอ → ไป /home
            if (isAuth) {
                this.navigate('/home', true);
            } else {
                this.navigate('/', true);
            }
            return;
        }
        
        // ✅ ถ้า login แล้วและอยู่หน้า root → redirect ไป /home
        if (isAuth && path === '/') {
            this.navigate('/home', true);
            return;
        }
        
        // ✅ ถ้ายังไม่ login แต่พยายามเข้าหน้าที่ต้อง auth
        if (route.requiresAuth && !isAuth) {
            this.navigate('/', true);
            return;
        }
        
        // ✅ Handle route ตามปกติ
        this.handleRoute();
    }

    route(path, handler, requiresAuth = false) {
        this.routes[path] = { handler, requiresAuth };
    }

    navigate(path, replace = false) {
        // ป้องกัน infinite loop
        if (this.isNavigating) {
            return;
        }

        const currentPath = this.getCurrentPath();
        
        // ถ้าอยู่หน้าเดียวกันอยู่แล้ว ไม่ต้อง navigate
        if (currentPath === path) {
            return;
        }
        
        const fullPath = this.basePath + path;
        
        this.isNavigating = true;
        
        try {
            if (replace) {
                window.history.replaceState({}, '', fullPath);
            } else {
                window.history.pushState({}, '', fullPath);
            }
            
            this.handleRoute();
        } finally {
            setTimeout(() => {
                this.isNavigating = false;
            }, 100);
        }
    }

    async handleRoute() {
        const path = this.getCurrentPath();
        const route = this.routes[path] || this.routes['*'];

        if (!route) {
            
            // ใช้ fallback route
            const fallback = this.routes['*'];
            if (fallback) {
                await fallback.handler();
                return;
            }
            
            // ถ้าไม่มี fallback ก็ redirect ไป /
            this.navigate('/', true);
            return;
        }

        // ตรวจสอบ authentication
        if (route.requiresAuth) {
            const isAuth = Auth.isAuthenticated();

            if (!isAuth) {
                
                if (path !== '/') {
                    this.navigate('/', true);
                }
                return;
            }
        }
        this.currentRoute = path;

        try {
            await route.handler();
        } catch (error) {
        }
    }

    getCurrentPath() {
        return window.location.pathname.replace(this.basePath, '') || '/';
    }
}

// ✅ สร้าง instance แต่ยังไม่ start
const router = new Router();
window.router = router;