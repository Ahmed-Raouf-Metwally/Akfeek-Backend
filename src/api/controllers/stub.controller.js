/**
 * Stub controller for endpoints not yet implemented.
 * Returns unified response: { success, message, data }
 */
class StubController {
  async list(req, res, next) {
    try {
      res.json({
        success: true,
        message: '',
        data: [],
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new StubController();
