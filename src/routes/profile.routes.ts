import { Router } from "express";
import { authenticate } from "../middleware/auth.js";
import { uploadProfileImage } from "../middleware/imageUpload.js";
import { getMyProfile, updateMyProfile, uploadMyProfileImage } from "../controllers/profile.controller.js";

const router: Router = Router();
router.use(authenticate);
router.get("/me", getMyProfile);
router.patch("/me", updateMyProfile);
router.post("/me/image", uploadProfileImage("image"), uploadMyProfileImage);

export default router;
