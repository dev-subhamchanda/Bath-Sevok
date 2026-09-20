import type { Request, Response } from 'express';
declare const signUpController: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
declare const signInContoller: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export { signInContoller, signUpController };
//# sourceMappingURL=auth.controller.d.ts.map