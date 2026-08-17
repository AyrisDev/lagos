-- UYAP Evrak İndirici eklentisinin "Taraf Bilgileri" sekmesinden yakaladığı
-- davacı/davalı/sanık + vekil bilgisini saklamak için.
-- Örnek içerik: [{"adi":"DURSUN İBER","rol":"Sanık","vekil":"[İPEK YİĞİT CAVLAK]","kisiKurum":"Kişi"}, ...]
alter table cases add column parties jsonb;
