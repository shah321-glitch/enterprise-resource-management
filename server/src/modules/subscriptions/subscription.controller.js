import * as subscriptionService from './subscription.service.js';

export const listSubscriptions = async (req, res, next) => {
  try {
    const result = await subscriptionService.listSubscriptions(req.query);
    res.status(200).json({
      success: true,
      data: result.subscriptions,
      meta: result.pagination,
    });
  } catch (error) {
    next(error);
  }
};

export const getSubscriptionById = async (req, res, next) => {
  try {
    const subscription = await subscriptionService.getSubscriptionById(req.params.id);
    res.status(200).json({
      success: true,
      data: subscription,
    });
  } catch (error) {
    next(error);
  }
};

export const createSubscription = async (req, res, next) => {
  try {
    const subscription = await subscriptionService.createSubscription(req.body, req.user, req);
    res.status(201).json({
      success: true,
      data: subscription,
      message: 'Subscription created successfully',
    });
  } catch (error) {
    next(error);
  }
};

export const updateSubscription = async (req, res, next) => {
  try {
    const subscription = await subscriptionService.updateSubscription(req.params.id, req.body, req.user, req);
    res.status(200).json({
      success: true,
      data: subscription,
      message: 'Subscription updated successfully',
    });
  } catch (error) {
    next(error);
  }
};

export const renewSubscription = async (req, res, next) => {
  try {
    const subscription = await subscriptionService.renewSubscription(req.params.id, req.body, req.user, req);
    res.status(200).json({
      success: true,
      data: subscription,
      message: 'Subscription renewed successfully',
    });
  } catch (error) {
    next(error);
  }
};

export const cancelSubscription = async (req, res, next) => {
  try {
    const subscription = await subscriptionService.cancelSubscription(req.params.id, req.body.reason, req.user, req);
    res.status(200).json({
      success: true,
      data: subscription,
      message: 'Subscription cancelled successfully',
    });
  } catch (error) {
    next(error);
  }
};

export const getUpcomingRenewals = async (req, res, next) => {
  try {
    const days = req.query.days ? parseInt(req.query.days, 10) : 30;
    const renewals = await subscriptionService.getUpcomingRenewals(days);
    res.status(200).json({
      success: true,
      data: renewals,
    });
  } catch (error) {
    next(error);
  }
};
