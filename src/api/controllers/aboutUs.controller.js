const aboutUsService = require('../../services/aboutUs.service');
const { AppError } = require('../middlewares/error.middleware');

async function getPublic(req, res, next) {
  try {
    const data = await aboutUsService.getPublicPayload();
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

async function adminGet(req, res, next) {
  try {
    const data = await aboutUsService.getAdminPayload();
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

async function adminUpdatePage(req, res, next) {
  try {
    const data = await aboutUsService.updatePage(req.body || {});
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

async function adminUploadLogo(req, res, next) {
  try {
    const file = req.file;
    if (!file) throw new AppError('No logo file (field name: logo)', 400, 'VALIDATION_ERROR');
    const relativePath = `/uploads/about-us/${file.filename}`;
    const data = await aboutUsService.setLogoUrl(relativePath);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

async function adminCreateCoreValue(req, res, next) {
  try {
    const { titleAr, descriptionAr } = req.body || {};
    if (!titleAr || !descriptionAr) {
      throw new AppError('titleAr and descriptionAr are required', 400, 'VALIDATION_ERROR');
    }
    const data = await aboutUsService.createCoreValue(req.body || {});
    res.status(201).json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

async function adminUpdateCoreValue(req, res, next) {
  try {
    const { id } = req.params;
    const updated = await aboutUsService.updateCoreValue(id, req.body || {});
    if (!updated) throw new AppError('Core value not found', 404, 'NOT_FOUND');
    const data = await aboutUsService.getAdminPayload();
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

async function adminDeleteCoreValue(req, res, next) {
  try {
    const { id } = req.params;
    const ok = await aboutUsService.deleteCoreValue(id);
    if (!ok) throw new AppError('Core value not found', 404, 'NOT_FOUND');
    const data = await aboutUsService.getAdminPayload();
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

async function adminUploadCoreValueIcon(req, res, next) {
  try {
    const { id } = req.params;
    const file = req.file;
    if (!file) throw new AppError('No icon file (field name: icon)', 400, 'VALIDATION_ERROR');
    const relativePath = `/uploads/about-us/icons/${id}/${file.filename}`;
    const row = await aboutUsService.setCoreValueIconUrl(id, relativePath);
    if (!row) throw new AppError('Core value not found', 404, 'NOT_FOUND');
    const data = await aboutUsService.getAdminPayload();
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getPublic,
  adminGet,
  adminUpdatePage,
  adminUploadLogo,
  adminCreateCoreValue,
  adminUpdateCoreValue,
  adminDeleteCoreValue,
  adminUploadCoreValueIcon,
};
