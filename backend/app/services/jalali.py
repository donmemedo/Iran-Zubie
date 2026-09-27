"""Gregorian -> Jalali (Solar Hijri) conversion.

Reports and chart axes are read by Iranian fleet managers, so dates are
rendered on the Persian calendar rather than translated Gregorian ones.
"""

from __future__ import annotations

from datetime import date

FA_DIGITS = "۰۱۲۳۴۵۶۷۸۹"
MONTHS_FA = [
    "فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور",
    "مهر", "آبان", "آذر", "دی", "بهمن", "اسفند",
]
WEEKDAYS_FA = ["دوشنبه", "سه‌شنبه", "چهارشنبه", "پنجشنبه", "جمعه", "شنبه", "یکشنبه"]
WEEKDAYS_EN = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

_G_DAYS = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334]


def to_jalali(value: date) -> tuple[int, int, int]:
    gy, gm, gd = value.year, value.month, value.day
    gy2 = gy - 1600
    gm2 = gm - 1
    gd2 = gd - 1

    day_no = 365 * gy2 + (gy2 + 3) // 4 - (gy2 + 99) // 100 + (gy2 + 399) // 400
    day_no += _G_DAYS[gm2] + gd2
    if gm > 2 and ((gy % 4 == 0 and gy % 100 != 0) or gy % 400 == 0):
        day_no += 1
    day_no -= 79

    j_np = day_no // 12053
    day_no %= 12053
    jy = 979 + 33 * j_np + 4 * (day_no // 1461)
    day_no %= 1461
    if day_no >= 366:
        jy += (day_no - 1) // 365
        day_no = (day_no - 1) % 365

    for index in range(11):
        month_len = 31 if index < 6 else 30
        if day_no < month_len:
            return jy, index + 1, day_no + 1
        day_no -= month_len
    return jy, 12, day_no + 1


def fa_digits(text: str | int) -> str:
    return "".join(FA_DIGITS[int(ch)] if ch.isdigit() else ch for ch in str(text))


def format_jalali(value: date, style: str = "short") -> str:
    jy, jm, jd = to_jalali(value)
    if style == "short":
        return f"{fa_digits(jd)} {MONTHS_FA[jm - 1]}"
    if style == "weekday":
        return WEEKDAYS_FA[value.weekday()]
    return f"{fa_digits(jd)} {MONTHS_FA[jm - 1]} {fa_digits(jy)}"
