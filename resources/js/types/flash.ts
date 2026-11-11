export type ToastType = 'success' | 'error' | 'info';

export type Toast = {
    type: ToastType;
    message: string;
};

export type FlashData = {
    toast?: Toast;
};
