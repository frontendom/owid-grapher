# -*- coding: utf-8 -*-
# Generated by Django 1.11 on 2017-05-25 10:16
from __future__ import unicode_literals

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('grapher_admin', '0001_initial'),
    ]

    operations = [
        migrations.AlterField(
            model_name='chart',
            name='id',
            field=models.AutoField(primary_key=True, serialize=False),
        ),
        migrations.AlterField(
            model_name='chart',
            name='published',
            field=models.NullBooleanField(default=None),
        ),
    ]
