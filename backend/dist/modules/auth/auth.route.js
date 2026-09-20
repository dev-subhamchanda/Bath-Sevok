import { Router } from 'express';
import { signUpController, signInContoller } from './auth.controller.js';
const router = Router();
router.post('/signup', signUpController);
router.post('/register', signUpController);
router.post('/signin', signInContoller);
router.post('/login', signInContoller);
router.get('/test', (req, res) => {
    res.json({
        "msg": "Auth Route is working !"
    });
});
export { router as authRouter };
//# sourceMappingURL=auth.route.js.map