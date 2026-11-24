from __future__ import annotations

import re
import unicodedata

from django import forms

from .models import Lead

PHONE = re.compile(r"^[0-9+()\-.\s]{6,40}$")
URL_LIKE = re.compile(r"https?://|www\.", re.I)


def clean_text(value: str, *, multiline: bool = False) -> str:
    """Drop control / invisible formatting characters, normalise whitespace."""
    value = unicodedata.normalize("NFC", value or "")
    kept = []
    for ch in value:
        cat = unicodedata.category(ch)
        if ch in "\n\t" and multiline:
            kept.append(ch)
        elif cat.startswith("C"):
            continue  # control, format (incl. bidi overrides), unassigned
        else:
            kept.append(ch)
    text = "".join(kept)
    if multiline:
        text = re.sub(r"\n{3,}", "\n\n", text)
        return text.strip()
    return re.sub(r"\s+", " ", text).strip()


class LeadForm(forms.Form):
    kind = forms.ChoiceField(choices=Lead.Kind.choices)
    name = forms.CharField(max_length=120, required=False)
    email = forms.EmailField(max_length=254)
    company = forms.CharField(max_length=160, required=False)
    phone = forms.CharField(max_length=40, required=False)
    interest = forms.CharField(max_length=160, required=False)
    product = forms.CharField(max_length=80, required=False)
    message = forms.CharField(max_length=2000, required=False)
    page = forms.CharField(max_length=200, required=False)

    def clean_name(self):
        return clean_text(self.cleaned_data["name"])

    def clean_company(self):
        return clean_text(self.cleaned_data["company"])

    def clean_interest(self):
        return clean_text(self.cleaned_data["interest"])

    def clean_product(self):
        return clean_text(self.cleaned_data["product"])

    def clean_message(self):
        return clean_text(self.cleaned_data["message"], multiline=True)

    def clean_email(self):
        return self.cleaned_data["email"].strip().lower()

    def clean_phone(self):
        phone = clean_text(self.cleaned_data["phone"])
        if phone and not PHONE.match(phone):
            raise forms.ValidationError("Use digits, spaces and + ( ) - only.")
        return phone

    def clean_page(self):
        page = clean_text(self.cleaned_data["page"])
        if not page.startswith("/") or page.startswith("//"):
            return ""
        return page[:200]

    def clean(self):
        data = super().clean()
        if data.get("kind") == Lead.Kind.INQUIRY:
            if not data.get("name"):
                self.add_error("name", "Tell us your name.")
            if not data.get("message"):
                self.add_error("message", "Add a line about what you need.")
        return data

    def looks_like_spam(self) -> bool:
        message = self.cleaned_data.get("message", "")
        return len(URL_LIKE.findall(message)) > 3 or bool(URL_LIKE.search(self.cleaned_data.get("name", "")))
