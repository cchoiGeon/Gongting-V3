import { 
    ConflictException, 
    Injectable, 
    InternalServerErrorException,
    UnauthorizedException 
} from '@nestjs/common';
import { User } from '../../db/entity/user.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuthCredentialsDto } from './dto/auth.dto';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { Auth } from 'src/db/entity/auth.entity';
import { UserService } from '../user/user.service';

@Injectable()
export class AuthService {
    constructor(
        private userService: UserService,

        @InjectRepository(Auth)
        private authRepository: Repository<Auth>,

        private jwtService: JwtService,
    ) {}

    async signup(authCredentialsDto: AuthCredentialsDto): Promise<User> {
        const { userId, password } = authCredentialsDto;

        try {
            const existUser = await this.userService.findUserByUserId(userId);
            if (existUser) {
                throw new ConflictException();
            }

            const hashPassword = await bcrypt.hash(password, 10);

            const user = await this.userService.createUser(userId,hashPassword);

            return await this.userService.saveUser(user);
        } catch (error) {
            console.error('Error during signup:', error); // 에러 로그 출력
            if(error.status == 409) {
                throw new ConflictException('Existing userId');
            }
            throw new InternalServerErrorException('Signup failed'); // 내부 서버 에러로 변환
        }
    }

    async signIn(authCredentialsDto: AuthCredentialsDto): Promise<{ accessToken: string }> {
        const { userId, password } = authCredentialsDto;

        try {
            const user = await this.userService.findUserByUserId(userId);

            if (!user) {
                throw new UnauthorizedException(); // 적절한 예외 반환
            }

            const checkPassword = await bcrypt.compare(password, user.password);

            if (checkPassword) {
                // 유저 토큰 생성 ( Secret + Payload )
                const payload = { uuid: user.uuid };
                const accessToken = await this.jwtService.sign(payload);
                return { accessToken };
            } else {
                throw new UnauthorizedException();
            }
        } catch (error) {
            console.error('Error during signIn:', error); // 에러 로그 출력
            if(error.status == 401) {
                throw new UnauthorizedException('Invalid credentials'); // 적절한 예외 반환
            }
            throw new InternalServerErrorException('SignIn failed'); // 내부 서버 에러로 변환
        }
    }

    async saveUserStudentCard(uuid:string) {
        try{
            return await this.authRepository.save({uuid});
        }catch(err){
            throw new InternalServerErrorException(); // 내부 서버 에러로 변환
        }
    }

    async getUserVerification(uuid:string){
        try{
            const userVerification = await this.authRepository.findOne({where:{uuid}});
            if(!userVerification){
                return 0;
            }
            return userVerification.verified;
        }catch(err){
            throw new InternalServerErrorException(); // 내부 서버 에러로 변환
        }
    }
}
