-- "Dava Dosyaları" ile "Sohbet" ekranındaki "Yeni Sohbet" konuşmalarını ayırmak için.
-- İkisi de cases tablosunu paylaşıyor; bu kolon olmadan her yeni sohbet Dava
-- Dosyaları listesinde de bir "dosya" olarak görünüyordu.
alter table cases add column kind text not null default 'case' check (kind in ('case', 'chat'));

-- Not: Bu migration'dan ÖNCE Sohbet ekranından "Yeni Sohbet" ile oluşturulmuş
-- kayıtlar (varsa) default 'case' alacağı için hâlâ Dava Dosyaları'nda görünmeye
-- devam eder — bunları Supabase Table Editor'dan elle silmeniz/kind='chat' yapmanız
-- gerekir. Bundan sonra oluşacaklar otomatik doğru ayrılacak.
