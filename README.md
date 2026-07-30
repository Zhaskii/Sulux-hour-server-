# DATABASE BACKUP COMMAND

pg_dump "postgres://postgres:MK2smWRWBpuJnh7GPdOUP3c2DGQkPFiPfTvcn5m2IUfRyJCHC6mI9urcpkigl1JY@209.50.229.110:5438/postgres" > backupforsuluxhour.sql

# DATABASE RESTORE COMMAND

psql "postgres://postgres:XXipjJLeWd9M3kIxGPVCvIdCq7zDXY3CJcetL9ljSKUtNW91EpyNVQcK2gxEHYyz@209.50.229.110:5440/postgres" < jul23.sql
