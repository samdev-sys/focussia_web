from rest_framework import viewsets, permissions, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from .models import User, RuedaVida, TimeBlock, KanbanTask, Recordatorio, ObjetivoSemana, KeepNota, MisionHoy, CategoriaRueda, RegistroRueda, MatrixItem, Factura
from .serializers import (
    UserSerializer, RuedaVidaSerializer, TimeBlockSerializer, KanbanTaskSerializer, 
    RecordatorioSerializer, ObjetivoSemanaSerializer, KeepNotaSerializer, MisionHoySerializer,
    CategoriaRuedaSerializer, RegistroRuedaSerializer, GuardarRuedaSerializer, MatrixItemSerializer, FacturaSerializer
)

class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    
    def get_permissions(self):
        if self.action == 'create':
            return [permissions.AllowAny()]
        return [permissions.IsAuthenticated()]

class BaseUserViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return self.queryset.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

class RuedaVidaViewSet(BaseUserViewSet):
    queryset = RuedaVida.objects.all()
    serializer_class = RuedaVidaSerializer

class TimeBlockViewSet(BaseUserViewSet):
    queryset = TimeBlock.objects.all()
    serializer_class = TimeBlockSerializer

class KanbanTaskViewSet(BaseUserViewSet):
    queryset = KanbanTask.objects.all()
    serializer_class = KanbanTaskSerializer

class RecordatorioViewSet(BaseUserViewSet):
    queryset = Recordatorio.objects.all()
    serializer_class = RecordatorioSerializer

class ObjetivoSemanaViewSet(BaseUserViewSet):
    queryset = ObjetivoSemana.objects.all()
    serializer_class = ObjetivoSemanaSerializer

class KeepNotaViewSet(BaseUserViewSet):
    queryset = KeepNota.objects.all()
    serializer_class = KeepNotaSerializer

class MisionHoyViewSet(BaseUserViewSet):
    queryset = MisionHoy.objects.all()
    serializer_class = MisionHoySerializer

class CategoriaRuedaViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = CategoriaRueda.objects.filter(activo=True)
    serializer_class = CategoriaRuedaSerializer
    permission_classes = [permissions.IsAuthenticated]

class RegistroRuedaViewSet(BaseUserViewSet):
    queryset = RegistroRueda.objects.all()
    serializer_class = RegistroRuedaSerializer

class MatrixItemViewSet(BaseUserViewSet):
    queryset = MatrixItem.objects.all()
    serializer_class = MatrixItemSerializer

class FacturaViewSet(BaseUserViewSet):
    queryset = Factura.objects.all()
    serializer_class = FacturaSerializer

@api_view(['GET', 'POST'])
@permission_classes([permissions.IsAuthenticated])
def rueda_vida_completa(request):
    if request.method == 'GET':
        categorias = CategoriaRueda.objects.filter(activo=True).order_by('orden')
        registros = RegistroRueda.objects.filter(user=request.user)
        
        result = []
        for cat in categorias:
            reg = registros.filter(categoria=cat).first()
            result.append({
                'id': cat.id,
                'nombre': cat.nombre,
                'icono': cat.icono,
                'puntaje': reg.puntaje if reg else 5
            })
        return Response(result)
    
    elif request.method == 'POST':
        puntajes = request.data.get('puntajes', {})
        
        for cat_id, puntaje in puntajes.items():
            try:
                categoria = CategoriaRueda.objects.get(id=cat_id, activo=True)
                RegistroRueda.objects.update_or_create(
                    user=request.user,
                    categoria=categoria,
                    defaults={'puntaje': puntaje}
                )
            except CategoriaRueda.DoesNotExist:
                continue
        
        return Response({'status': 'ok'})
