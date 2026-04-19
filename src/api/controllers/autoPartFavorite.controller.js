const autoPartFavoriteService = require('../../services/autoPartFavorite.service');

async function listFavorites(req, res, next) {
  try {
    const { page, limit } = req.query;
    const data = await autoPartFavoriteService.listFavorites(req.user.id, {
      page,
      limit,
    });
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

async function addFavorite(req, res, next) {
  try {
    const { autoPartId } = req.body;
    const data = await autoPartFavoriteService.addFavorite(req.user.id, autoPartId);
    res.status(201).json({
      success: true,
      message: 'Added to favorites',
      messageAr: 'تمت الإضافة إلى المفضلة',
      data,
    });
  } catch (err) {
    next(err);
  }
}

async function removeFavorite(req, res, next) {
  try {
    const { autoPartId } = req.params;
    const data = await autoPartFavoriteService.removeFavorite(req.user.id, autoPartId);
    res.json({
      success: true,
      message: 'Removed from favorites',
      messageAr: 'تمت الإزالة من المفضلة',
      data,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listFavorites,
  addFavorite,
  removeFavorite,
};
