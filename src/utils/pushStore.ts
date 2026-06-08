type Subscription = any;

const userSubscriptions = new Map<number, Subscription>();

export const saveSubscription = (userId: number, sub: Subscription) => {
  userSubscriptions.set(userId, sub);
};

export const getSubscription = (userId: number) => {
  return userSubscriptions.get(userId);
};
