<?php

namespace App\Payments;

use RuntimeException;

/**
 * The payment provider is not configured or did not answer.
 */
class PaymentUnavailable extends RuntimeException {}
