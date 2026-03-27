from rest_framework import serializers
from .models import User, RuedaVida, TimeBlock, KanbanTask, Recordatorio, ObjetivoSemana, KeepNota, MisionHoy, CategoriaRueda, RegistroRueda, MatrixItem, Factura

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'password']
        extra_kwargs = {'password': {'write_only': True}}

    def create(self, validated_data):
        user = User.objects.create_user(**validated_data)
        return user

class RuedaVidaSerializer(serializers.ModelSerializer):
    class Meta:
        model = RuedaVida
        fields = '__all__'
        read_only_fields = ['user']

class TimeBlockSerializer(serializers.ModelSerializer):
    class Meta:
        model = TimeBlock
        fields = '__all__'
        read_only_fields = ['user']

class KanbanTaskSerializer(serializers.ModelSerializer):
    class Meta:
        model = KanbanTask
        fields = '__all__'
        read_only_fields = ['user']

class RecordatorioSerializer(serializers.ModelSerializer):
    class Meta:
        model = Recordatorio
        fields = '__all__'
        read_only_fields = ['user']

class ObjetivoSemanaSerializer(serializers.ModelSerializer):
    class Meta:
        model = ObjetivoSemana
        fields = '__all__'
        read_only_fields = ['user']

class KeepNotaSerializer(serializers.ModelSerializer):
    class Meta:
        model = KeepNota
        fields = '__all__'
        read_only_fields = ['user']

class MisionHoySerializer(serializers.ModelSerializer):
    class Meta:
        model = MisionHoy
        fields = '__all__'
        read_only_fields = ['user']

class CategoriaRuedaSerializer(serializers.ModelSerializer):
    class Meta:
        model = CategoriaRueda
        fields = ['id', 'nombre', 'icono', 'orden']

class RegistroRuedaSerializer(serializers.ModelSerializer):
    categoria = CategoriaRuedaSerializer(read_only=True)
    categoria_id = serializers.IntegerField(write_only=True)
    
    class Meta:
        model = RegistroRueda
        fields = ['id', 'categoria', 'categoria_id', 'puntaje', 'fecha_creacion']
        read_only_fields = ['user', 'fecha_creacion']

class GuardarRuedaSerializer(serializers.Serializer):
    puntajes = serializers.DictField(child=serializers.IntegerField())

class MatrixItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = MatrixItem
        fields = '__all__'
        read_only_fields = ['user', 'created_at']

class FacturaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Factura
        fields = '__all__'
        read_only_fields = ['user', 'creado_en']
