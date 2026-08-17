-- Dilekçe Hazırlama'da bir şablon seçildiğinde, o şablonun DİLİNİ/FORMATINI (büronun
-- kendi imzası) AI'nin taslak üretirken referans alabilmesi için şablonların da
-- documents gibi çıkarılmış metni tutuluyor.
alter table templates add column extracted_text text;
