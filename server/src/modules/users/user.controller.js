import * as userService from './user.service.js';

export const listUsers = async (req, res, next) => {
  try {
    const { page, limit, search, role, department, isActive } = req.query;
    const result = await userService.listUsers({
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
      search,
      role,
      department,
      isActive,
    });
    res.status(200).json({
      success: true,
      data: result.users,
      meta: result.pagination,
    });
  } catch (error) {
    next(error);
  }
};

export const getUserById = async (req, res, next) => {
  try {
    const user = await userService.getUserById(req.params.id);
    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

export const updateUser = async (req, res, next) => {
  try {
    const user = await userService.updateUser(req.params.id, req.body, req.user, req);
    res.status(200).json({
      success: true,
      data: user,
      message: 'User updated successfully',
    });
  } catch (error) {
    next(error);
  }
};

export const setUserStatus = async (req, res, next) => {
  try {
    const { isActive } = req.body;
    const user = await userService.setUserStatus(req.params.id, isActive, req.user, req);
    res.status(200).json({
      success: true,
      data: user,
      message: `User ${isActive ? 'activated' : 'deactivated'} successfully`,
    });
  } catch (error) {
    next(error);
  }
};
